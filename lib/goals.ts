import { db } from "./db";
import type { Goal, GoalKind } from "./goals-shared";

export async function getGoals(): Promise<Goal[]> {
  const sql = await db();
  const rows = await sql`SELECT id::text, kind, metric_id, percent, target_value, start_value, per_week,
                                to_char(start_day, 'YYYY-MM-DD') AS start_day, to_char(due_day, 'YYYY-MM-DD') AS due_day
                         FROM goals ORDER BY id`;
  return rows.map((r) => ({
    id: r.id as string,
    kind: r.kind as GoalKind,
    metricId: r.metric_id as string | null,
    percent: r.percent as number | null,
    targetValue: r.target_value as number | null,
    startValue: r.start_value as number | null,
    perWeek: r.per_week as number | null,
    startDay: r.start_day as string,
    dueDay: r.due_day as string | null,
  }));
}

export async function addGoal(goal: Omit<Goal, "id">) {
  const sql = await db();
  await sql`INSERT INTO goals (kind, metric_id, percent, target_value, start_value, per_week, start_day, due_day)
            VALUES (${goal.kind}, ${goal.metricId}, ${goal.percent}, ${goal.targetValue}, ${goal.startValue}, ${goal.perWeek},
                    ${goal.startDay}::date, ${goal.dueDay}::date)`;
}

export async function deleteGoal(id: string) {
  const sql = await db();
  await sql`DELETE FROM goals WHERE id = ${id}::bigint`;
}

// A "reach" goal on a trend-scored metric is that metric's target, so the daily score follows the goal.
export async function setMetricTarget(metricId: string, target: number) {
  const sql = await db();
  await sql`UPDATE metrics SET target = ${target} WHERE id = ${metricId} AND scoring = 'trend'`;
}
