const TZ = "Europe/Athens";

// YYYY-MM-DD for a moment in time, in the user's timezone.
export function dayOf(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

export function isDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
