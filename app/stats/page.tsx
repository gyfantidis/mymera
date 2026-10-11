import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig, getRange } from "@/lib/db";
import { addDays, dayOf, formatDay, isDay } from "@/lib/dates";
import { activeSections, scoringMetrics } from "@/lib/metrics";
import { PERIODS, PERIOD_LABELS, daysIn, isPeriod, periodLabel, periodRange, shiftPeriod, weekStart, type Period } from "@/lib/periods";
import type { Metric } from "@/lib/metrics";
import { TREND_LOOKBACK, windowAverage, type Series } from "@/lib/score";
import { average, buckets, dayPoints, metricStats, trendHistory, type Bucket, type DayPoint, type MetricStat } from "@/lib/stats";

export default function Page({ searchParams }: PageProps<"/stats">) {
  return (
    <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
      <Stats searchParams={searchParams} />
    </Suspense>
  );
}

const nf = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });

async function Stats({ searchParams }: Pick<PageProps<"/stats">, "searchParams">) {
  const { p, d } = await searchParams;
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
      <nav aria-label="Περίοδος" className="flex gap-1 rounded-xl bg-track p-1">
        {PERIODS.map((x) => (
          <Link key={x} href={`/stats?p=${x}&d=${anchor}`} aria-current={x === period ? "page" : undefined} className={tab(x === period)}>
            {PERIOD_LABELS[x]}
          </Link>
        ))}
      </nav>

      <header className="flex items-center justify-between">
        <Link href={`/stats?p=${period}&d=${prev.from}`} aria-label="Προηγούμενη περίοδος" className={arrow}>
          ←
        </Link>
        <h1 className="text-lg font-semibold">{periodLabel(period, from, to)}</h1>
        {next <= today ? (
          <Link href={`/stats?p=${period}&d=${next}`} aria-label="Επόμενη περίοδος" className={arrow}>
            →
          </Link>
        ) : (
          <span className="px-3 py-2 text-transparent">→</span>
        )}
      </header>

      {logged.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Δεν υπάρχουν καταχωρήσεις σε αυτή την περίοδο.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Card label="Μέσο σκορ" value={String(Math.round(avg!))}>
              {delta === null ? "χωρίς προηγούμενη περίοδο" : (
                <span className={delta > 0 ? "text-good" : delta < 0 ? "text-bad" : ""}>
                  {delta > 0 ? "+" : delta < 0 ? "−" : ""}
                  {Math.abs(delta)} από την προηγούμενη
                </span>
              )}
            </Card>
            <Card label="Μέρες με καταχώρηση" value={`${logged.length} / ${elapsed.length}`}>
              {Math.round((logged.length / elapsed.length) * 100)}% της περιόδου
            </Card>
            <Card label="Καλύτερη μέρα" value={String(best!.score)}>
              <Link href={`/?d=${best!.day}`} className="capitalize underline-offset-2 hover:underline">
                {formatDay(best!.day)}
              </Link>
            </Card>
            <Card label="Χειρότερη μέρα" value={String(worst!.score)}>
              <Link href={`/?d=${worst!.day}`} className="capitalize underline-offset-2 hover:underline">
                {formatDay(worst!.day)}
              </Link>
            </Card>
          </dl>

          <section>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Σκορ ανά {period === "quarter" ? "εβδομάδα" : period === "year" ? "μήνα" : "μέρα"}
            </h2>
            <Chart items={buckets(period, points)} />
          </section>

          {period !== "week" && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Ημερολόγιο</h2>
              <Heatmap points={points} from={from} to={to} today={today} />
            </section>
          )}

          {trendMetrics.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Τάσεις</h2>
              <div className="flex flex-col gap-3">
                {trendMetrics.map((m) => (
                  <TrendCard key={m.id} metric={m} series={series[m.id] ?? {}} days={elapsed.map((x) => x.day)} span={points.length} />
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
                    <MetricRow key={s.metric.id} stat={s} />
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

function Chart({ items }: { items: Bucket[] }) {
  const every = items.length > 14 ? 5 : 1;
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex h-32 items-end gap-[3px]">
        {items.map((b) => (
          <Link key={b.key} href={b.href} title={`${b.label}: ${b.score ?? "χωρίς δεδομένα"}`} className="flex h-full flex-1 items-end">
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

// One column per week (Monday on top), darker cells for higher scores.
function Heatmap({ points, from, to, today }: { points: DayPoint[]; from: string; to: string; today: string }) {
  const byDay = new Map(points.map((p) => [p.day, p.score]));
  const cells = daysIn(weekStart(from), addDays(weekStart(to), 6));
  const columns = cells.length / 7;
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div
        className="grid grid-flow-col gap-[3px]"
        style={{ gridTemplateRows: "repeat(7, 1fr)", gridAutoColumns: "1fr", maxWidth: `${columns * 30}px` }}
      >
        {cells.map((day) => {
          if (day < from || day > to) return <span key={day} className="aspect-square" />;
          const score = byDay.get(day) ?? null;
          if (day > today) return <span key={day} className="aspect-square rounded-[3px] border border-border" />;
          return (
            <Link
              key={day}
              href={`/?d=${day}`}
              title={`${formatDay(day)}: ${score ?? "χωρίς δεδομένα"}`}
              className="aspect-square rounded-[3px] bg-track"
              style={score === null ? undefined : { background: `color-mix(in srgb, var(--good) ${15 + score * 0.85}%, var(--track))` }}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted">Κάθε στήλη είναι μια εβδομάδα, από Δευτέρα έως Κυριακή. Πιο σκούρο σημαίνει υψηλότερο σκορ.</p>
    </div>
  );
}

// Logged values as dots, their 7-day average as a line, the goal as a dashed line.
function TrendCard({ metric: m, series, days, span }: { metric: Metric; series: Series; days: string[]; span: number }) {
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
        <p className="text-xs text-muted">Χωρίς μετρήσεις σε αυτή την περίοδο.</p>
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
          {nf.format(last)} {m.unit}
          <span className="ml-1 text-[10px] text-muted">μ.ό. 7 ημερών</span>
        </p>
      </div>
      <p className="text-xs text-muted">
        {change === 0 ? "Σταθερό" : `${change > 0 ? "+" : "−"}${nf.format(Math.abs(change))} ${m.unit}`} στην περίοδο
        {m.target > 0 && ` · απομένουν ${nf.format(Math.abs(last - m.target))} ${m.unit} για τον στόχο των ${nf.format(m.target)}`}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={`Γράφημα: ${m.name}`}>
        {m.target > 0 && (
          <line x1="0" x2={W} y1={y(m.target)} y2={y(m.target)} className="stroke-muted" strokeWidth="1" strokeDasharray="4 4" />
        )}
        <polyline points={line} fill="none" className="stroke-good" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (v === undefined ? null : <circle key={days[i]} cx={x(i)} cy={y(v)} r="3" className="fill-muted" />))}
      </svg>
      <p className="mt-1 text-[10px] text-muted">
        Τελείες: μετρήσεις. Γραμμή: μέσος όρος 7 ημερών.{m.target > 0 && " Διακεκομμένη: στόχος."}
      </p>
    </div>
  );
}

function MetricRow({ stat: { metric: m, logged, total, hits } }: { stat: MetricStat }) {
  const penalty = m.role === "penalty";
  let main: string;
  let detail: string;
  if (logged === 0) {
    main = "–";
    detail = "χωρίς καταχώρηση";
  } else if (m.input === "bool") {
    main = `${hits} ${hits === 1 ? "μέρα" : "μέρες"}`;
    detail = "";
  } else if (m.input === "rating") {
    main = `${nf.format(total / logged)} / 5`;
    detail = `στόχος σε ${hits} από ${logged} μέρες`;
  } else if (m.scoring === "trend") {
    main = `${nf.format(total / logged)} ${m.unit}`;
    detail = `${logged} ${logged === 1 ? "μέτρηση" : "μετρήσεις"}`;
  } else {
    main = `${nf.format(total / logged)} ${m.unit}`;
    detail = `σύνολο ${nf.format(total)} · ${penalty ? `ποινή σε ${hits}` : `στόχος σε ${hits}`} από ${logged} μέρες`;
  }
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{m.name}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className={`tabular-nums ${penalty && hits > 0 ? "text-bad" : ""}`}>{main}</p>
        {logged > 0 && m.input !== "bool" && <p className="text-[10px] text-muted">μέσος όρος</p>}
      </div>
    </li>
  );
}
