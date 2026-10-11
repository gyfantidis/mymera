import { timingSafeEqual } from "node:crypto";
import { setEntry } from "@/lib/db";
import { dayOf } from "@/lib/dates";

// Receives Apple Health data pushed from the phone (shape of the "Health Auto Export" app's
// REST automation: { data: { metrics: [...], workouts: [...] } }), aggregated per day.

type Sample = { date?: string; qty?: number; totalSleep?: number; asleep?: number; sleepEnd?: string };
type HealthMetric = { name?: string; data?: Sample[] };
type Workout = { start?: string; end?: string };

// "2026-10-11 07:30:00 +0300" -> Date
function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.trim().replace(/^(\S+) (\S+) ([+-]\d{2}):?(\d{2})$/, "$1T$2$3:$4"));
  return isNaN(d.getTime()) ? null : d;
}

function authorized(req: Request): boolean {
  const expected = process.env.INGEST_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.INGEST_TOKEN) return Response.json({ error: "INGEST_TOKEN is not set" }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { data?: { metrics?: HealthMetric[]; workouts?: Workout[] } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // day -> metric -> value
  const totals: Record<string, Record<string, number>> = {};
  const add = (date: Date | null, metric: string, amount: number) => {
    if (!date || !Number.isFinite(amount)) return;
    const day = (totals[dayOf(date)] ??= {});
    day[metric] = (day[metric] ?? 0) + amount;
  };

  for (const m of body.data?.metrics ?? []) {
    for (const s of m.data ?? []) {
      if (m.name === "step_count") add(parseDate(s.date), "steps", s.qty ?? NaN);
      // A night counts toward the day you woke up.
      if (m.name === "sleep_analysis") add(parseDate(s.sleepEnd) ?? parseDate(s.date), "sleep", s.totalSleep ?? s.asleep ?? NaN);
    }
  }
  for (const w of body.data?.workouts ?? []) {
    const start = parseDate(w.start);
    const end = parseDate(w.end);
    if (start && end) add(start, "workout", (end.getTime() - start.getTime()) / 60000);
  }

  let saved = 0;
  for (const [day, metrics] of Object.entries(totals)) {
    for (const [metric, value] of Object.entries(metrics)) {
      // Skipped when the user has removed that metric.
      if (await setEntry(day, metric, Math.round(value * 100) / 100, "health")) saved++;
    }
  }
  return Response.json({ saved, days: Object.keys(totals).sort() });
}
