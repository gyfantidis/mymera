"use server";

import { refresh } from "next/cache";
import { getConfig, getRange } from "@/lib/db";
import { addDays, dayOf, isDay } from "@/lib/dates";
import { addGoal, deleteGoal, setMetricTarget } from "@/lib/goals";
import { currentLevel, type GoalKind } from "@/lib/goals-shared";
import { scoringMetrics } from "@/lib/metrics";
import { balanceAt } from "@/lib/money";
import { seriesOf } from "@/lib/stats";

export type GoalInput = {
  kind: GoalKind;
  // null means the money balance (reach goals only).
  metricId: string | null;
  percent?: number;
  targetValue?: number;
  perWeek?: number;
  dueDay?: string | null;
};

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export async function createGoal(input: GoalInput) {
  const today = dayOf(new Date());
  const metric = input.metricId === null ? undefined : scoringMetrics(await getConfig()).find((m) => m.id === input.metricId);
  if (input.metricId !== null && !metric) throw new Error("Unknown metric");
  const base = { metricId: input.metricId, percent: null, targetValue: null, startValue: null, perWeek: null, startDay: today, dueDay: null };

  if (input.kind === "change") {
    if (!metric || metric.input !== "number" || metric.scoring === "trend") throw new Error("Change goals need a daily number");
    if (!finite(input.percent) || input.percent === 0 || input.percent < -100 || input.percent > 1000) throw new Error("Invalid percent");
    await addGoal({ ...base, kind: "change", percent: input.percent });
  } else if (input.kind === "frequency") {
    if (!metric || metric.role === "penalty") throw new Error("Frequency goals need a non-penalty metric");
    if (!Number.isInteger(input.perWeek) || input.perWeek! < 1 || input.perWeek! > 7) throw new Error("Invalid frequency");
    await addGoal({ ...base, kind: "frequency", perWeek: input.perWeek! });
  } else if (input.kind === "reach") {
    if (metric && metric.input === "bool") throw new Error("Reach goals need a number");
    if (!finite(input.targetValue) || Math.abs(input.targetValue) > 99_999_999) throw new Error("Invalid target");
    const dueDay = input.dueDay ?? null;
    if (dueDay !== null && (!isDay(dueDay) || dueDay <= today)) throw new Error("Invalid due date");
    const startValue = metric
      ? currentLevel(seriesOf(await getRange(addDays(today, -90), today), metric.id), today)
      : await balanceAt(today);
    await addGoal({ ...base, kind: "reach", targetValue: input.targetValue, startValue, dueDay });
    if (metric?.scoring === "trend" && input.targetValue > 0) await setMetricTarget(metric.id, input.targetValue);
  } else throw new Error("Invalid goal kind");
  refresh();
}

export async function removeGoal(id: string) {
  if (!/^\d{1,18}$/.test(id)) throw new Error("Invalid id");
  await deleteGoal(id);
  refresh();
}
