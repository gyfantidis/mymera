import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import Heatmap from "../heatmap";
import { getConfig, getRange } from "@/lib/db";
import { addDays, dayOf, isDay } from "@/lib/dates";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { activeSections, scoringMetrics } from "@/lib/metrics";
import { PERIODS, daysIn, isPeriod, periodLabel, periodRange, shiftPeriod, weekStart, type Period } from "@/lib/periods";
import type { Metric } from "@/lib/metrics";
import { TREND_LOOKBACK, windowAverage, type Series } from "@/lib/score";
import { average, buckets, dayPoints, metricStats, trendHistory, type Bucket, type DayPoint, type MetricStat } from "@/lib/stats";
import LoadingText from "../loading-text";

export default function Page({ searchParams }: PageProps<"/stats">) {
  return (
    <Suspense fallback={<LoadingText />}>
      <Stats searchParams={searchParams} />
    </Suspense>
  );
}

async function Stats({ searchParams }: Pick<PageProps<"/stats">, "searchParams">) {
  const { p, d } = await searchParams;
  const f = await getI18n();
  const { t } = f;
  await connection();
  const today = dayOf(new Date());
  const period: Period = isPeriod(p) ? p : "month";
  const anchor = isDay(d) && d <= today ? d : today;

  const { from, to } = periodRange(period, anchor);
  const prev = periodRange(period, shiftPeriod(period, from, -1));
  const next = shiftPeriod(period, from, 1);

  const [range, config] = await Promise.all([getRange(addDays(prev.from, -TREND_LOOKBACK), to), getConfig()]);
  const metrics = scoringMetrics(config);

  const points = dayPoints(metrics, range, daysIn(from, to));
  const elapsed = points.filter((x) => x.day <= today);
  const logged = elapsed.filter((x) => x.score !== null) as { day: string; score: number }[];
  const avg = average(elapsed);
  const prevAvg = average(dayPoints(metrics, range, daysIn(prev.from, prev.to)));
  const delta = avg !== null && prevAvg !== null ? Math.round(avg) - Math.round(prevAvg) : null;
  const best = logged.reduce<(typeof logged)[number] | null>((a, b) => (a && a.score >= b.score ? a : b), null);
  const worst = logged.reduce<(typeof logged)[number] | null>((a, b) => (a && a.score <= b.score ? a : b), null);
  const stats = metricStats(metrics, range, elapsed.map((x) => x.day));
  const series = trendHistory(metrics, range);
  const trendMetrics = metrics.filter((m) => m.scoring === "trend");

  const tab = (active: boolean) => `flex-1 rounded-lg py-1.5 text-center text-sm ${active ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-fg"}`;
  const arrow = "rounded-lg px-3 py-2 text-muted hover:bg-track";

  return (
    <main className="flex flex-col gap-6">
      <nav aria-label={t("stats.periodNav")} className="flex gap-1 rounded-xl bg-track p-1">
        {PERIODS.map((x) => (
          <Link key={x} href={`/stats?p=${x}&d=${anchor}`} aria-current={x === period ? "page" : undefined} className={tab(x === period)}>
            {t(`period.${x}`)}
          </Link>
        ))}
      </nav>

      <header className="flex items-center justify-between">
        <Link href={`/stats?p=${period}&d=${prev.from}`} aria-label={t("stats.prev")} className={arrow}>
          ←
        </Link>
        <h1 className="text-lg font-semibold">{periodLabel(period, from, to, f)}</h1>
        {next <= today ? (
          <Link href={`/stats?p=${period}&d=${next}`} aria-label={t("stats.next")} className={arrow}>
            →
          </Link>
        ) : (
          <span className="px-3 py-2 text-transparent">→</span>
        )}
      </header>

      {logged.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {t("stats.empty")}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Card label={t("stats.avgScore")} value={String(Math.round(avg!))}>
              {delta === null ? t("stats.noPrev") : (
                <span className={delta > 0 ? "text-good" : delta < 0 ? "text-bad" : ""}>
                  {t("stats.fromPrev", { delta: `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)}` })}
                </span>
              )}
            </Card>
            <Card label={t("stats.daysLogged")} value={`${logged.length} / ${elapsed.length}`}>
              {t("stats.ofPeriod", { pct: Math.round((logged.length / elapsed.length) * 100) })}
            </Card>
            <Card label={t("stats.best")} value={String(best!.score)}>
              <Link href={`/?d=${best!.day}`} className="capitalize underline-offset-2 hover:underline">
                {f.day(best!.day)}
              </Link>
            </Card>
            <Card label={t("stats.worst")} value={String(worst!.score)}>
              <Link href={`/?d=${worst!.day}`} className="capitalize underline-offset-2 hover:underline">
                {f.day(worst!.day)}
              </Link>
            </Card>
          </dl>

          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              {t(period === "quarter" ? "stats.scoreByWeek" : period === "year" ? "stats.scoreByMonth" : "stats.scoreByDay")}
            </h2>
            <Chart items={buckets(period, points, f)} noData={t("noData")} />
          </section>

          {period !== "week" && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("stats.calendar")}</h2>
              <div className="rounded-2xl border border-border bg-surface p-3">
                <Heatmap points={points} from={from} to={to} today={today} months={period !== "month"} f={f} />
                <p className="mt-2 text-[10px] text-muted">
                  {t("stats.calendarHelp")}
                </p>
              </div>
            </section>
          )}

          {trendMetrics.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("stats.trends")}</h2>
              <div className="flex flex-col gap-3">
                {trendMetrics.map((m) => (
                  <TrendCard key={m.id} metric={m} series={series[m.id] ?? {}} days={elapsed.map((x) => x.day)} span={points.length} f={f} />
                ))}
              </div>
            </section>
          )}

          {activeSections(config).map((section) => {
            const rows = stats.filter((s) => s.metric.sectionId === section.id);
            if (rows.length === 0) return null;
            return (
              <section key={section.id}>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{section.name}</h2>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                  {rows.map((s) => (
                    <MetricRow key={s.metric.id} stat={s} f={f} />
                  ))}
                </ul>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}

function Card({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd>
        <span className="block text-2xl font-semibold tabular-nums">{value}</span>
        <span className="block text-xs text-muted">{children}</span>
      </dd>
    </div>
  );
}

function Chart({ items, noData }: { items: Bucket[]; noData: string }) {
  const every = items.length > 14 ? 5 : 1;
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex h-32 items-end gap-[3px]">
        {items.map((b) => (
          <Link key={b.key} href={b.href} title={`${b.label}: ${b.score ?? noData}`} className="flex h-full flex-1 items-end">
            <span
              className={`w-full rounded-sm ${b.score === null ? "bg-track" : "bg-good"}`}
              style={{ height: b.score === null ? "3px" : `${Math.max(4, b.score)}%` }}
            />
          </Link>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] text-[10px] text-muted">
        {items.map((b, i) => (
          <span key={b.key} className="flex-1 overflow-visible whitespace-nowrap text-center">
            {i % every === 0 ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

// Logged values as dots, their 7-day average as a line, the goal as a dashed line.
function TrendCard({ metric: m, series, days, span, f }: { metric: Metric; series: Series; days: string[]; span: number; f: I18n }) {
  const { t } = f;
  const W = 600;
  const H = 150;
  const values = days.map((d) => series[d]);
  const averages = days.map((d) => windowAverage(series, d));
  const known = [...values, ...averages].filter((v): v is number => v != null);
  const first = averages.find((v) => v !== null) ?? null;
  const last = averages.findLast((v) => v !== null) ?? null;

  if (known.length === 0 || first == null || last == null) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-medium">{m.name}</p>
        <p className="text-xs text-muted">{t("stats.noMeasurements")}</p>
      </div>
    );
  }

  const all = m.target > 0 ? [...known, m.target] : known;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.15 || 1;
  const x = (i: number) => (span > 1 ? (i / (span - 1)) * W : W / 2);
  const y = (v: number) => H - ((v - (min - pad)) / (max - min + 2 * pad)) * H;
  const line = averages.flatMap((v, i) => (v === null ? [] : [`${x(i).toFixed(1)},${y(v).toFixed(1)}`])).join(" ");
  const change = Math.round((last - first) * 10) / 10;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">{m.name}</p>
        <p className="tabular-nums">
          {f.num(last)} {m.unit}
          <span className="ml-1 text-[10px] text-muted">{t("stats.avg7")}</span>
        </p>
      </div>
      <p className="text-xs text-muted">
        {change === 0
          ? t("stats.steadyInPeriod")
          : t("stats.changeInPeriod", { change: `${change > 0 ? "+" : "−"}${f.num(Math.abs(change))} ${m.unit}` })}
        {m.target > 0 && ` · ${t("stats.leftToGoal", { left: `${f.num(Math.abs(last - m.target))} ${m.unit}`, goal: f.num(m.target) })}`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={t("stats.chart", { name: m.name })}>
        {m.target > 0 && (
          <line x1="0" x2={W} y1={y(m.target)} y2={y(m.target)} className="stroke-muted" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <polyline points={line} fill="none" className="stroke-good" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (v === undefined ? null : <circle key={days[i]} cx={x(i)} cy={y(v)} r="3" className="fill-muted" />))}
      </svg>
      <p className="mt-1 text-[10px] text-muted">
        {t("stats.legend")}
        {m.target > 0 && ` ${t("stats.legendGoal")}`}
      </p>
    </div>
  );
}

function MetricRow({ stat: { metric: m, logged, total, hits }, f }: { stat: MetricStat; f: I18n }) {
  const { t } = f;
  const penalty = m.role === "penalty";
  let main: string;
  let detail: string;
  if (logged === 0) {
    main = "–";
    detail = t("stats.notLogged");
  } else if (m.input === "bool") {
    main = f.plural(hits, "stats.days.one", "stats.days.other");
    detail = "";
  } else if (m.input === "rating") {
    main = `${f.num(total / logged)} / 5`;
    detail = t("stats.targetOn", { hits, logged });
  } else if (m.scoring === "trend") {
    main = `${f.num(total / logged)} ${m.unit}`;
    detail = f.plural(logged, "stats.measure.one", "stats.measure.other");
  } else {
    main = `${f.num(total / logged)} ${m.unit}`;
    detail = t(penalty ? "stats.totalPenalty" : "stats.totalTarget", { total: f.num(total), hits, logged });
  }
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{m.name}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={`tabular-nums ${penalty && hits > 0 ? "text-bad" : ""}`}>{main}</p>
        {logged > 0 && m.input !== "bool" && <p className="text-[10px] text-muted">{t("stats.average")}</p>}
      </div>
    </li>
  );
}
