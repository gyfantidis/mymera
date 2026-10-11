import { createClient, type Client, type InStatement } from "@libsql/client";
import { DEFAULT_CONFIG, type Config, type InputKind, type Role } from "./metrics";
import type { Values } from "./score";

// Local file by default; set DATABASE_URL (+ DATABASE_AUTH_TOKEN) for a hosted libSQL/Turso db.
let ready: Promise<Client> | undefined;

function db(): Promise<Client> {
  ready ??= (async () => {
    const client = createClient({
      url: process.env.DATABASE_URL ?? "file:mymera.db",
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    await client.batch([
      `CREATE TABLE IF NOT EXISTS entries (
         day TEXT NOT NULL,
         metric TEXT NOT NULL,
         value REAL NOT NULL,
         source TEXT NOT NULL,
         updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
         PRIMARY KEY (day, metric)
       )`,
      `CREATE TABLE IF NOT EXISTS sections (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         position INTEGER NOT NULL,
         archived INTEGER NOT NULL DEFAULT 0
       )`,
      `CREATE TABLE IF NOT EXISTS metrics (
         id TEXT PRIMARY KEY,
         section_id TEXT NOT NULL REFERENCES sections (id),
         name TEXT NOT NULL,
         role TEXT NOT NULL,
         input TEXT NOT NULL,
         unit TEXT NOT NULL,
         target REAL NOT NULL,
         free REAL NOT NULL,
         points REAL NOT NULL,
         step REAL NOT NULL,
         position INTEGER NOT NULL,
         archived INTEGER NOT NULL DEFAULT 0
       )`,
    ]);
    const count = await client.execute("SELECT count(*) AS n FROM sections");
    if (Number(count.rows[0].n) === 0) await client.batch(configStatements(DEFAULT_CONFIG), "write");
    return client;
  })();
  return ready;
}

// The metric's input type is fixed once created, so existing entries keep their meaning.
function configStatements(config: Config): InStatement[] {
  return [
    ...config.sections.map((s, i) => ({
      sql: `INSERT INTO sections (id, name, position, archived) VALUES (?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = excluded.name, position = excluded.position, archived = excluded.archived`,
      args: [s.id, s.name, i, s.archived ? 1 : 0],
    })),
    ...config.metrics.map((m, i) => ({
      sql: `INSERT INTO metrics (id, section_id, name, role, input, unit, target, free, points, step, position, archived)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET section_id = excluded.section_id, name = excluded.name, role = excluded.role,
              unit = excluded.unit, target = excluded.target, free = excluded.free, points = excluded.points,
              step = excluded.step, position = excluded.position, archived = excluded.archived`,
      args: [m.id, m.sectionId, m.name, m.role, m.input, m.unit, m.target, m.free, m.points, m.step, i, m.archived ? 1 : 0],
    })),
  ];
}

export async function getConfig(): Promise<Config> {
  const client = await db();
  const [sections, metrics] = await client.batch(
    ["SELECT * FROM sections ORDER BY position", "SELECT * FROM metrics ORDER BY position"],
    "read",
  );
  return {
    sections: sections.rows.map((r) => ({ id: r.id as string, name: r.name as string, archived: !!r.archived })),
    metrics: metrics.rows.map((r) => ({
      id: r.id as string,
      sectionId: r.section_id as string,
      name: r.name as string,
      role: r.role as Role,
      input: r.input as InputKind,
      unit: r.unit as string,
      target: Number(r.target),
      free: Number(r.free),
      points: Number(r.points),
      step: Number(r.step),
      archived: !!r.archived,
    })),
  };
}

export async function saveConfig(config: Config) {
  await (await db()).batch(configStatements(config), "write");
}

export type Entry = { value: number; source: string };
export type Range = Record<string, Record<string, Entry>>;

export async function getRange(from: string, to: string): Promise<Range> {
  const res = await (await db()).execute({
    sql: "SELECT day, metric, value, source FROM entries WHERE day BETWEEN ? AND ?",
    args: [from, to],
  });
  const out: Range = {};
  for (const r of res.rows) {
    (out[r.day as string] ??= {})[r.metric as string] = { value: Number(r.value), source: r.source as string };
  }
  return out;
}

export function toValues(entries: Record<string, Entry> | undefined): Values {
  return Object.fromEntries(Object.entries(entries ?? {}).map(([k, e]) => [k, e.value]));
}

// value === null clears the entry. Returns false when the metric does not exist.
export async function setEntry(day: string, metric: string, value: number | null, source: string): Promise<boolean> {
  const client = await db();
  if (value === null) {
    await client.execute({ sql: "DELETE FROM entries WHERE day = ? AND metric = ?", args: [day, metric] });
    return true;
  }
  const res = await client.execute({
    sql: `INSERT INTO entries (day, metric, value, source)
          SELECT ?, id, ?, ? FROM metrics WHERE id = ?
          ON CONFLICT (day, metric) DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = CURRENT_TIMESTAMP`,
    args: [day, value, source, metric],
  });
  return res.rowsAffected > 0;
}
