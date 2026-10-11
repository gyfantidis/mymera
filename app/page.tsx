import { connection } from "next/server";
import { Suspense } from "react";
import { getOverrides, getRange, toValues } from "@/lib/db";
import { addDays, dayOf, isDay } from "@/lib/dates";
import { applyOverrides } from "@/lib/metrics";
import { dayScore } from "@/lib/score";
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
  const [range, overrides] = await Promise.all([getRange(from, day), getOverrides()]);
  const metrics = applyOverrides(overrides);

  const history = Array.from({ length: HISTORY_DAYS }, (_, i) => {
    const date = addDays(from, i);
    return { day: date, score: range[date] ? dayScore(metrics, toValues(range[date])).total : null };
  });

  return (
    <DayView
      key={day}
      day={day}
      isToday={day === today}
      metrics={metrics}
      entries={range[day] ?? {}}
      history={history}
    />
  );
}
