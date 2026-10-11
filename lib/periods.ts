import { addDays } from "./dates";

export type Period = "week" | "month" | "quarter" | "year";

export const PERIODS: Period[] = ["week", "month", "quarter", "year"];

export const PERIOD_LABELS: Record<Period, string> = {
  week: "Εβδομάδα",
  month: "Μήνας",
  quarter: "Τρίμηνο",
  year: "Έτος",
};

export const isPeriod = (s: unknown): s is Period => PERIODS.includes(s as Period);

const utc = (day: string) => new Date(day + "T12:00:00Z");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const ymd = (y: number, m: number, d: number) => iso(new Date(Date.UTC(y, m, d, 12)));

// Monday of the week containing the day.
export function weekStart(day: string): string {
  return addDays(day, -((utc(day).getUTCDay() + 6) % 7));
}

export function periodRange(period: Period, day: string): { from: string; to: string } {
  const d = utc(day);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (period === "week") {
    const from = weekStart(day);
    return { from, to: addDays(from, 6) };
  }
  if (period === "month") return { from: ymd(y, m, 1), to: ymd(y, m + 1, 0) };
  if (period === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { from: ymd(y, q, 1), to: ymd(y, q + 3, 0) };
  }
  return { from: ymd(y, 0, 1), to: ymd(y, 12, 0) };
}

// First day of the period n steps away from the one that starts at `from`.
export function shiftPeriod(period: Period, from: string, n: number): string {
  if (period === "week") return addDays(from, 7 * n);
  const d = utc(from);
  const months = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + months * n, 1);
}

export function daysIn(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => utc(day).toLocaleDateString("el-GR", { ...opts, timeZone: "UTC" });

export function periodLabel(period: Period, from: string, to: string): string {
  if (period === "week") return `${fmt(from, { day: "numeric", month: "short" })} – ${fmt(to, { day: "numeric", month: "short", year: "numeric" })}`;
  if (period === "month") return fmt(from, { month: "long", year: "numeric" });
  if (period === "quarter") return `${Math.floor(utc(from).getUTCMonth() / 3) + 1}ο τρίμηνο ${from.slice(0, 4)}`;
  return from.slice(0, 4);
}

export const shortDay = (day: string) => fmt(day, { day: "numeric", month: "short" });
export const weekdayShort = (day: string) => fmt(day, { weekday: "short" });
export const monthShort = (day: string) => fmt(day, { month: "short" });
