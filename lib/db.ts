import { createClient, type Client } from "@libsql/client";
import { DEFAULT_METRICS, type Overrides } from "./metrics";
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
      `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    ]);
    return client;
  })();
  return ready;
}

const KEYS = new Set(DEFAULT_METRICS.map((m) => m.key));

export type Entry = { value: number; source: string };

export async function getRange(from: string, to: string): Promise<Record<string, Record<string, Entry>>> {
  const res = await (await db()).execute({
    sql: "SELECT day, metric, value, source FROM entries WHERE day BETWEEN ? AND ?",
    args: [from, to],
  });
  const out: Record<string, Record<string, Entry>> = {};
  for (const r of res.rows) {
    (out[r.day as string] ??= {})[r.metric as string] = { value: Number(r.value), source: r.source as string };
  }
  return out;
}

export function toValues(entries: Record<string, Entry> | undefined): Values {
  return Object.fromEntries(Object.entries(entries ?? {}).map(([k, e]) => [k, e.value]));
}

// value === null clears the entry.
export async function setEntry(day: string, metric: string, value: number | null, source: string) {
  if (!KEYS.has(metric)) throw new Error(`Unknown metric: ${metric}`);
  const client = await db();
  if (value === null) {
    await client.execute({ sql: "DELETE FROM entries WHERE day = ? AND metric = ?", args: [day, metric] });
    return;
  }
  await client.execute({
    sql: `INSERT INTO entries (day, metric, value, source) VALUES (?, ?, ?, ?)
          ON CONFLICT (day, metric) DO UPDATE SET value = excluded.value, source = excluded.source, updated_at = CURRENT_TIMESTAMP`,
    args: [day, metric, value, source],
  });
}

export async function getOverrides(): Promise<Overrides> {
  const res = await (await db()).execute("SELECT value FROM settings WHERE key = 'overrides'");
  return res.rows[0] ? JSON.parse(res.rows[0].value as string) : {};
}

export async function setOverrides(overrides: Overrides) {
  await (await db()).execute({
    sql: `INSERT INTO settings (key, value) VALUES ('overrides', ?)
          ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    args: [JSON.stringify(overrides)],
  });
}
