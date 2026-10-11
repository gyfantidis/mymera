import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig, getNote, getRange } from "@/lib/db";
import { addDays, dayOf, isDay } from "@/lib/dates";
import { activeSections, scoringMetrics } from "@/lib/metrics";
import { getGoals } from "@/lib/goals";
import { GOAL_LOOKBACK, goalProgress, goalTitle } from "@/lib/goals-shared";
import { balanceAt, monthlyTotals } from "@/lib/money";
import { daysIn, periodLabel, periodRange } from "@/lib/periods";
import { TREND_LOOKBACK, trend } from "@/lib/score";
import { dayPoints, seriesOf, trendHistory } from "@/lib/stats";
import DayView from "./day-view";
import Overview from "./overview";

// The home calendar covers the last year, like a GitHub contribution graph.
const HISTORY_DAYS = 53 * 7;

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
      <Day searchParams={searchParams} />
    </Suspense>
  );
}

async function Day({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { d } = await searchParams;
  await connection();
  const today = dayOf(new Date());
  const day = isDay(d) && d <= today ? d : today;

  const from = addDays(today, -(HISTORY_DAYS - 1));
  const month = periodRange("month", today);
  const [config, note, goals, totals, balance] = await Promise.all([
    getConfig(),
    getNote(day),
    getGoals(),
    monthlyTotals(month.from, month.to),
    balanceAt(today),
  ]);
  // One query covers the open day, the year calendar and the history each goal needs.
  const earliest = [day, addDays(from, -TREND_LOOKBACK), ...goals.map((g) => addDays(g.startDay, -GOAL_LOOKBACK))].sort()[0];
  const range = await getRange(addDays(earliest, -TREND_LOOKBACK), today);
  const metrics = scoringMetrics(config);
  const trends = trendHistory(metrics, range);

  // The overview describes the present, so it only appears on today's page.
  const overview = day === today && (
    <Overview
      trends={metrics
        .filter((m) => m.scoring === "trend")
        .map((m) => ({ id: m.id, name: m.name, unit: m.unit, target: m.target, ...trend(m, trends[m.id] ?? {}, today) }))}
      money={{
        month: periodLabel("month", month.from, month.to),
        result: totals.reduce((s, t) => s + t.income - t.expense, 0),
        balance,
      }}
      goals={goals.flatMap((goal) => {
        const metric = metrics.find((m) => m.id === goal.metricId);
        if (goal.metricId !== null && !metric) return [];
        const progress = goalProgress(goal, metric, metric ? seriesOf(range, metric.id) : {}, balance, today);
        return [{ id: goal.id, title: goalTitle(goal, metric), progress }];
      })}
    />
  );

  return (
    <DayView
      key={day}
      day={day}
      sections={activeSections(config)}
      metrics={metrics}
      entries={range[day] ?? {}}
      trends={trends}
      overview={overview}
      note={note}
      today={today}
      history={dayPoints(metrics, range, daysIn(from, today))}
    />
  );
}
