import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig, getNote, getRange } from "@/lib/db";
import { addDays, dayOf, isDay } from "@/lib/dates";
import { activeSections, scoringMetrics } from "@/lib/metrics";
import { daysIn } from "@/lib/periods";
import { TREND_LOOKBACK } from "@/lib/score";
import { dayPoints, trendHistory } from "@/lib/stats";
import DayView from "./day-view";

const HISTORY_DAYS = 14;

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

  const from = addDays(day, -(HISTORY_DAYS - 1));
  const [range, config, note] = await Promise.all([getRange(addDays(from, -TREND_LOOKBACK), day), getConfig(), getNote(day)]);
  const metrics = scoringMetrics(config);

  return (
    <DayView
      key={day}
      day={day}
      isToday={day === today}
      sections={activeSections(config)}
      metrics={metrics}
      entries={range[day] ?? {}}
      trends={trendHistory(metrics, range)}
      note={note}
      history={dayPoints(metrics, range, daysIn(from, day))}
    />
  );
}
