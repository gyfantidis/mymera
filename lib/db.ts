import postgres from "postgres";
import { DEFAULT_CONFIG, type Config, type InputKind, type Role } from "./metrics";
import { MIGRATIONS } from "./migrations";
import type { Values } from "./score";

type Sql = postgres.Sql;

// Kept on globalThis so dev hot reloads reuse one connection pool instead of leaking a new one each time.
const globals = globalThis as { mymeraDb?: Promise<Sql> };

function db(): Promise<Sql> {
  globals.mymeraDb ??= (async () => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and run `npm run db:up`.");
    const sql = postgres(url, { max: 5, onnotice: () => {} });
    try {
      await migrate(sql);
    } catch (e) {
      await sql.end();
      throw e;
    }
    return sql;
  })().catch((e) => {
    globals.mymeraDb = undefined;
    throw e;
  });
  return globals.mymeraDb;
}

async function migrate(sql: Sql) {
  await sql.begin(async (tx) => {
    // Serialises concurrent starts so two processes never run the same migration.
    await tx`SELECT pg_advisory_xact_lock(727274)`;
    await tx`CREATE TABLE IF NOT EXISTS schema_migrations (
               version INTEGER PRIMARY KEY,
               applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
             )`;
    const applied = new Set((await tx`SELECT version FROM schema_migrations`).map((r) => r.version as number));
    for (const [i, statements] of MIGRATIONS.entries()) {
      const version = i + 1;
      if (applied.has(version)) continue;
      await tx.unsafe(statements);
      await tx`INSERT INTO schema_migrations (version) VALUES (${version})`;
    }
    const [{ n }] = await tx`SELECT count(*)::int AS n FROM sections`;
    if (n === 0) await writeConfig(tx, DEFAULT_CONFIG);
  });
}

// The metric's input type is fixed once created, so existing entries keep their meaning.
async function writeConfig(tx: postgres.TransactionSql, config: Config) {
  for (const [i, s] of config.sections.entries()) {
    await tx`INSERT INTO sections (id, name, position, archived) VALUES (${s.id}, ${s.name}, ${i}, ${s.archived})
             ON CONFLICT (id) DO UPDATE SET name = excluded.name, position = excluded.position, archived = excluded.archived`;
  }
  for (const [i, m] of config.metrics.entries()) {
    await tx`INSERT INTO metrics (id, section_id, name, role, input, unit, target, free, points, step, position, archived)
             VALUES (${m.id}, ${m.sectionId}, ${m.name}, ${m.role}, ${m.input}, ${m.unit}, ${m.target}, ${m.free}, ${m.points}, ${m.step}, ${i}, ${m.archived})
             ON CONFLICT (id) DO UPDATE SET section_id = excluded.section_id, name = excluded.name, role = excluded.role,
               unit = excluded.unit, target = excluded.target, free = excluded.free, points = excluded.points,
               step = excluded.step, position = excluded.position, archived = excluded.archived`;
  }
}

export async function getConfig(): Promise<Config> {
  const sql = await db();
  const [sections, metrics] = await Promise.all([
    sql`SELECT id, name, archived FROM sections ORDER BY position`,
    sql`SELECT * FROM metrics ORDER BY position`,
  ]);
  return {
    sections: sections.map((r) => ({ id: r.id as string, name: r.name as string, archived: r.archived as boolean })),
    metrics: metrics.map((r) => ({
      id: r.id as string,
      sectionId: r.section_id as string,
      name: r.name as string,
      role: r.role as Role,
      input: r.input as InputKind,
      unit: r.unit as string,
      target: r.target as number,
      free: r.free as number,
      points: r.points as number,
      step: r.step as number,
      archived: r.archived as boolean,
    })),
  };
}

export async function saveConfig(config: Config) {
  await (await db()).begin((tx) => writeConfig(tx, config));
}

export type Entry = { value: number; source: string };
export type Range = Record<string, Record<string, Entry>>;

export async function getRange(from: string, to: string): Promise<Range> {
  const sql = await db();
  const rows = await sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, metric, value, source
                         FROM entries WHERE day BETWEEN ${from}::date AND ${to}::date`;
  const out: Range = {};
  for (const r of rows) (out[r.day as string] ??= {})[r.metric as string] = { value: r.value as number, source: r.source as string };
  return out;
}

export function toValues(entries: Record<string, Entry> | undefined): Values {
  return Object.fromEntries(Object.entries(entries ?? {}).map(([k, e]) => [k, e.value]));
}

// value === null clears the entry. Returns false when the metric does not exist.
export async function setEntry(day: string, metric: string, value: number | null, source: string): Promise<boolean> {
  const sql = await db();
  if (value === null) {
    await sql`DELETE FROM entries WHERE day = ${day}::date AND metric = ${metric}`;
    return true;
  }
  const res = await sql`INSERT INTO entries (day, metric, value, source)
                        SELECT ${day}::date, id, ${value}, ${source} FROM metrics WHERE id = ${metric}
                        ON CONFLICT (day, metric) DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = now()`;
  return res.count > 0;
}
