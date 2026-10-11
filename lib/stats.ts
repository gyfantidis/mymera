import { toValues, type Range } from "./db";
import type { Metric } from "./metrics";
import { monthShort, weekStart, weekdayShort, type Period } from "./periods";
import { dayScore } from "./score";

export type DayPoint = { day: string; score: number | null };

// Days without any entry get a null score and are left out of every average.
export function dayPoints(metrics: Metric[], range: Range, days: string[]): DayPoint[] {
  return days.map((day) => ({ day, score: range[day] ? dayScore(metrics, toValues(range[day])).total : null }));
}

export function average(points: DayPoint[]): number | null {
  const scores = points.flatMap((p) => (p.score === null ? [] : [p.score]));
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

export type Bucket = { key: string; label: string; score: number | null; href: string };

// Bars for the chart: days for a week or month, weeks for a quarter, months for a year.
export function buckets(period: Period, points: DayPoint[]): Bucket[] {
  if (period === "week" || period === "month") {
    return points.map((p) => ({
      key: p.day,
      label: period === "week" ? weekdayShort(p.day) : String(Number(p.day.slice(8))),
      score: p.score,
      href: `/?d=${p.day}`,
    }));
  }
  const groups = new Map<string, DayPoint[]>();
  for (const p of points) {
    const key = period === "quarter" ? weekStart(p.day) : p.day.slice(0, 7) + "-01";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups].map(([key, group]) => {
    const avg = average(group);
    return {
      key,
      label: period === "quarter" ? `${Number(key.slice(8))}/${Number(key.slice(5, 7))}` : monthShort(key),
      score: avg === null ? null : Math.round(avg),
      href: `/stats?p=${period === "quarter" ? "week" : "month"}&d=${group[0].day}`,
    };
  });
}

export type MetricStat = {
  metric: Metric;
  logged: number;
  total: number;
  // core/bonus: days the target was reached. penalty: days that cost points.
  hits: number;
};

export function metricStats(metrics: Metric[], range: Range, days: string[]): MetricStat[] {
  return metrics.map((metric) => {
    const stat: MetricStat = { metric, logged: 0, total: 0, hits: 0 };
    for (const day of days) {
      const value = range[day]?.[metric.id]?.value;
      if (value === undefined) continue;
      stat.logged++;
      stat.total += value;
      if (metric.role === "penalty" ? value > metric.free : value >= metric.target) stat.hits++;
    }
    return stat;
  });
}
