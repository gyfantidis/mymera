import { addDays } from "./dates";
import type { Metric } from "./metrics";

export type Values = Record<string, number | undefined>;
// One metric's values by day.
export type Series = Record<string, number | undefined>;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const TREND_DAYS = 7;
// Days of history before a given day that trend scoring looks at.
export const TREND_LOOKBACK = TREND_DAYS * 2 - 1;

// Average of the values logged in the `TREND_DAYS` days ending on `endDay`.
export function windowAverage(series: Series, endDay: string): number | null {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < TREND_DAYS; i++) {
    const v = series[addDays(endDay, -i)];
    if (v !== undefined) {
      sum += v;
      n++;
    }
  }
  return n ? sum / n : null;
}

export type Trend = { average: number | null; previous: number | null; fraction: number };

// Full points while this week's average is closer to the target than last week's (or already there),
// half when it is flat, none when it moves away. Until there is a goal and a previous week to
// compare with, logging at all earns the points.
export function trend(m: Metric, series: Series, day: string): Trend {
  const average = windowAverage(series, day);
  const previous = windowAverage(series, addDays(day, -TREND_DAYS));
  let fraction: number;
  if (average === null) fraction = 0;
  else if (m.target <= 0 || previous === null) fraction = 1;
  else {
    const now = Math.abs(average - m.target);
    const before = Math.abs(previous - m.target);
    const flat = m.target * 0.001;
    if (now <= m.target * 0.005 || now < before - flat) fraction = 1;
    else fraction = now <= before + flat ? 0.5 : 0;
  }
  return { average, previous, fraction };
}

// Fraction of the metric's points that apply: 0..1 for both gains and penalties.
// For trend metrics pass the fraction from trend().
export function progress(m: Metric, value: number | undefined, trendFraction = 0): number {
  if (m.scoring === "trend") return trendFraction;
  if (value === undefined) return 0;
  if (m.role === "penalty") {
    const span = m.target - m.free;
    return span <= 0 ? (value > m.free ? 1 : 0) : clamp01((value - m.free) / span);
  }
  return m.target <= 0 ? 0 : clamp01(value / m.target);
}

export function metricPoints(m: Metric, value: number | undefined, trendFraction = 0): number {
  if (m.role === "track") return 0;
  const p = m.points * progress(m, value, trendFraction);
  return m.role === "penalty" ? -p : p;
}

export type DayScore = {
  total: number;
  core: number;
  bonus: number;
  penalty: number;
};

// Expects metrics from scoringMetrics(), where core points already add up to 100.
// `history` holds each trend metric's values by day; the day's own value comes from `values`.
export function dayScore(metrics: Metric[], values: Values, day: string, history: Record<string, Series> = {}): DayScore {
  const sums = { core: 0, bonus: 0, penalty: 0, track: 0 };
  for (const m of metrics) {
    const fraction = m.scoring === "trend" ? trend(m, { ...history[m.id], [day]: values[m.id] }, day).fraction : 0;
    sums[m.role] += metricPoints(m, values[m.id], fraction);
  }
  const raw = sums.core + sums.bonus + sums.penalty;
  return { total: Math.round(Math.min(100, Math.max(0, raw))), core: sums.core, bonus: sums.bonus, penalty: sums.penalty };
}
