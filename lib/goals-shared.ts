// Goal types and progress maths; safe to import from client components.
import { addDays } from "./dates";
import type { Metric } from "./metrics";
import type { I18n } from "./i18n";
import { weekStart } from "./periods";
import { windowAverage, type Series } from "./score";

export type GoalKind = "change" | "reach" | "frequency";

export const GOAL_KINDS: GoalKind[] = ["change", "reach", "frequency"];

export type Goal = {
  id: string;
  kind: GoalKind;
  // null means the money balance.
  metricId: string | null;
  percent: number | null;
  targetValue: number | null;
  startValue: number | null;
  perWeek: number | null;
  startDay: string;
  dueDay: string | null;
};

// How far back a "change" goal looks for its starting average, and what it needs to set one.
export const BASELINE_DAYS = 30;
const BASELINE_MIN = 7;
const BASELINE_COLLECT = 14;
// Entries older than this before a goal's start are never needed.
export const GOAL_LOOKBACK = BASELINE_DAYS;

export type Progress = {
  // 0..1 toward the goal; null while there is not enough data to say.
  fraction: number | null;
  status: "collecting" | "done" | "on" | "behind";
  // One line saying where things stand, without units formatting concerns left to the caller.
  current: number | null;
  target: number | null;
  start: number | null;
  // frequency: achieved weeks in a row before this one. collecting: values gathered so far / needed.
  streak?: number;
  have?: number;
  need?: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const loggedDays = (series: Series, from: string, to: string) =>
  Object.keys(series)
    .filter((d) => d >= from && d <= to && series[d] !== undefined)
    .sort();
const mean = (series: Series, days: string[]) => days.reduce((s, d) => s + series[d]!, 0) / days.length;

// Average before the goal started; if there was too little history, the first two weeks of entries instead.
function baseline(series: Series, startDay: string, today: string): { value: number | null; have: number; need: number } {
  const from = addDays(startDay, -BASELINE_DAYS);
  const before = loggedDays(series, from, addDays(startDay, -1));
  if (before.length >= BASELINE_MIN) return { value: mean(series, before), have: before.length, need: BASELINE_MIN };
  const all = loggedDays(series, from, today);
  if (all.length >= BASELINE_COLLECT) return { value: mean(series, all.slice(0, BASELINE_COLLECT)), have: BASELINE_COLLECT, need: BASELINE_COLLECT };
  return { value: null, have: all.length, need: BASELINE_COLLECT };
}

// The current level of a metric: its 7-day average, or failing that its most recent value.
export function currentLevel(series: Series, today: string): number | null {
  const avg = windowAverage(series, today);
  if (avg !== null) return avg;
  const days = loggedDays(series, "0000-00-00", today);
  return days.length ? series[days.at(-1)!]! : null;
}

function toward(start: number, target: number, current: number): number {
  return start === target ? (current === target ? 1 : 0) : clamp01((current - start) / (target - start));
}

// Share of the time between start and due date that has passed.
function expected(goal: Goal, today: string): number | null {
  if (!goal.dueDay) return null;
  const total = Date.parse(goal.dueDay) - Date.parse(goal.startDay);
  return total <= 0 ? 1 : clamp01((Date.parse(today) - Date.parse(goal.startDay)) / total);
}

export function dayHits(m: Metric, value: number | undefined): boolean {
  if (value === undefined) return false;
  // A trend metric's target is a level to reach, so any measurement counts as doing it.
  return m.scoring === "trend" ? true : value >= m.target;
}

// `series` is the goal's metric by day; `balance` is the current money balance for balance goals.
export function goalProgress(goal: Goal, metric: Metric | undefined, series: Series, balance: number, today: string): Progress {
  if (goal.kind === "frequency") {
    const need = goal.perWeek ?? 1;
    const count = (monday: string) => [0, 1, 2, 3, 4, 5, 6].filter((i) => metric && dayHits(metric, series[addDays(monday, i)])).length;
    const thisWeek = weekStart(today);
    const done = count(thisWeek);
    let streak = 0;
    for (let w = addDays(thisWeek, -7); w >= weekStart(goal.startDay) && count(w) >= need; w = addDays(w, -7)) streak++;
    const daysLeft = 6 - Math.round((Date.parse(today) - Date.parse(thisWeek)) / 86400000);
    const todayHit = !!metric && dayHits(metric, series[today]);
    const canStill = done + daysLeft + (todayHit ? 0 : 1) >= need;
    return {
      fraction: clamp01(done / need),
      status: done >= need ? "done" : canStill ? "on" : "behind",
      current: done,
      target: need,
      start: null,
      streak,
    };
  }

  if (goal.kind === "change") {
    const base = baseline(series, goal.startDay, today);
    const current = windowAverage(series, today);
    if (base.value === null) return { fraction: null, status: "collecting", current, target: null, start: null, have: base.have, need: base.need };
    const target = base.value * (1 + (goal.percent ?? 0) / 100);
    if (current === null) return { fraction: null, status: "collecting", current, target, start: base.value };
    const fraction = toward(base.value, target, current);
    return { fraction, status: fraction >= 1 ? "done" : fraction > 0 ? "on" : "behind", current, target, start: base.value };
  }

  const target = goal.targetValue ?? 0;
  const current = goal.metricId === null ? balance : currentLevel(series, today);
  // Without a recorded start, the first measurement after the goal began stands in for it.
  const firstDay = loggedDays(series, goal.startDay, today)[0];
  const start = goal.startValue ?? (firstDay ? series[firstDay]! : null);
  if (current === null || start === null) return { fraction: null, status: "collecting", current, target, start };
  const fraction = toward(start, target, current);
  const due = expected(goal, today);
  // Without a due date there is no pace to fall behind; only moving away from the target counts as behind.
  const movedAway = start !== target && (current - start) / (target - start) < -0.02;
  const status = fraction >= 1 ? "done" : due === null ? (movedAway ? "behind" : "on") : fraction >= due - 0.05 ? "on" : "behind";
  return { fraction, status, current, target, start };
}

// Money for the balance, the metric's unit otherwise.
export function goalAmount(n: number, metric: Metric | undefined, f: I18n): string {
  return metric ? `${f.num(n)}${metric.unit ? ` ${metric.unit}` : ""}` : f.money(n);
}

export function goalTitle(goal: Goal, metric: Metric | undefined, f: I18n): string {
  const name = metric?.name ?? f.t("goals.balance");
  if (goal.kind === "change") return f.t(goal.percent! < 0 ? "goals.title.decrease" : "goals.title.increase", { name, pct: f.num(Math.abs(goal.percent!)) });
  if (goal.kind === "frequency") return f.plural(goal.perWeek!, "goals.title.freq.one", "goals.title.freq.other", { name });
  return `${name}: ${goalAmount(goal.targetValue!, metric, f)}`;
}
