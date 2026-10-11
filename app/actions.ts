"use server";

import { refresh } from "next/cache";
import { setEntry, setOverrides } from "@/lib/db";
import { isDay } from "@/lib/dates";
import { DEFAULT_METRICS, type Overrides } from "@/lib/metrics";

export async function saveEntry(day: string, metric: string, value: number | null) {
  if (!isDay(day)) throw new Error("Invalid day");
  if (value !== null && (!Number.isFinite(value) || value < 0)) throw new Error("Invalid value");
  await setEntry(day, metric, value, "manual");
  refresh();
}

export async function saveOverrides(input: Overrides) {
  const clean: Overrides = {};
  for (const m of DEFAULT_METRICS) {
    const o = input[m.key];
    if (!o) continue;
    const entry: Overrides[string] = {};
    for (const f of ["target", "free", "points"] as const) {
      const v = o[f];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v !== m[f]) entry[f] = v;
    }
    if (Object.keys(entry).length) clean[m.key] = entry;
  }
  await setOverrides(clean);
  refresh();
}
