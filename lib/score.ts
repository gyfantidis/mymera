import type { Metric } from "./metrics";

export type Values = Record<string, number | undefined>;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Fraction of the metric's points that apply: 0..1 for both gains and penalties.
export function progress(m: Metric, value: number | undefined): number {
  if (value === undefined) return 0;
  if (m.role === "penalty") {
    const span = m.target - m.free;
    return span <= 0 ? (value > m.free ? 1 : 0) : clamp01((value - m.free) / span);
  }
  return m.target <= 0 ? 0 : clamp01(value / m.target);
}

export function metricPoints(m: Metric, value: number | undefined): number {
  const p = m.points * progress(m, value);
  return m.role === "penalty" ? -p : p;
}

export type DayScore = {
  total: number;
  core: number;
  bonus: number;
  penalty: number;
};

// Expects metrics from scoringMetrics(), where core points already add up to 100.
export function dayScore(metrics: Metric[], values: Values): DayScore {
  const sums = { core: 0, bonus: 0, penalty: 0 };
  for (const m of metrics) sums[m.role] += metricPoints(m, values[m.id]);
  const raw = sums.core + sums.bonus + sums.penalty;
  return { total: Math.round(Math.min(100, Math.max(0, raw))), ...sums };
}
