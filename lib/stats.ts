import { toValues, type Range } from "./db";
import type { Metric } from "./metrics";
import type { I18n } from "./i18n";
import { weekStart, type Period } from "./periods";
import { dayScore, type Series } from "./score";

export type DayPoint = { day: string; score: number | null };

// One metric's values by day.
export function seriesOf(range: Range, metricId: string): Series {
  return Object.fromEntries(Object.entries(range).flatMap(([day, e]) => (e[metricId] ? [[day, e[metricId].value]] : [])));
}

// Values by day for each trend-scored metric.
export function trendHistory(metrics: Metric[], range: Range): Record<string, Series> {
  return Object.fromEntries(metrics.filter((m) => m.scoring === "trend").map((m) => [m.id, seriesOf(range, m.id)]));
}

// Days without any entry get a null score and are left out of every average.
// `range` must reach TREND_LOOKBACK days before the first day for trend metrics to score correctly.
export function dayPoints(metrics: Metric[], range: Range, days: string[]): DayPoint[] {
  const history = trendHistory(metrics, range);
  return days.map((day) => ({ day, score: range[day] ? dayScore(metrics, toValues(range[day]), day, history).total : null }));
}

export function average(points: DayPoint[]): number | null {
  const scores = points.flatMap((p) => (p.score === null ? [] : [p.score]));
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

export type Bucket = { key: string; label: string; score: number | null; href: string };

// Bars for the chart: days for a week or month, weeks for a quarter, months for a year.
export function buckets(period: Period, points: DayPoint[], f: I18n): Bucket[] {
  if (period === "week" || period === "month") {
    return points.map((p) => ({
      key: p.day,
      label: period === "week" ? f.weekday(p.day) : String(Number(p.day.slice(8))),
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
      label: period === "quarter" ? `${Number(key.slice(8))}/${Number(key.slice(5, 7))}` : f.month(key),
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
