"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveEntry, saveNote } from "./actions";
import Bar from "./bar";
import Heatmap from "./heatmap";
import { useI18n } from "./locale-provider";
import type { Entry } from "@/lib/db";
import { addDays } from "@/lib/dates";
import type { I18n } from "@/lib/i18n";
import type { Metric, Section } from "@/lib/metrics";
import { dayScore, metricPoints, progress, trend, type Series, type Trend, type Values } from "@/lib/score";

type Props = {
  day: string;
  today: string;
  sections: Section[];
  metrics: Metric[];
  entries: Record<string, Entry>;
  // Values by day for each trend-scored metric, up to and including this day.
  trends: Record<string, Series>;
  // Each metric's values on the six days before this one, oldest first.
  recent: Record<string, (number | null)[]>;
  note: string;
  // Server-rendered summary of weight, money and goals; absent on past days.
  overview: React.ReactNode;
  history: { day: string; score: number | null }[];
};

// Sources other than manual entry that get a badge next to the value.
const SOURCES = ["health", "mac"] as const;

export default function DayView({ day, today, sections, metrics, entries, trends, recent, note, overview, history }: Props) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
  );
  const [error, setError] = useState(false);
  // The metric changed most recently, so only that change is celebrated.
  const [touched, setTouched] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isToday = day === today;
  const f = useI18n();
  const { t } = f;
  const fmt = f.num;

  const score = dayScore(metrics, values, day, trends);
  const hasData = Object.values(values).some((v) => v !== undefined);

  function update(metric: string, value: number | undefined) {
    setValues((v) => ({ ...v, [metric]: value }));
    setTouched(metric);
    setError(false);
    startTransition(async () => {
      try {
        await saveEntry(day, metric, value ?? null);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href={`/?d=${addDays(day, -1)}`} aria-label={t("day.prev")} className="rounded-lg px-3 py-2 text-muted hover:bg-track">
          ←
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold capitalize">{f.day(day)}</h1>
          {isToday && <p className="text-xs text-muted">{t("day.today")}</p>}
        </div>
        {isToday ? (
          <span className="px-3 py-2 text-transparent">→</span>
        ) : (
          <Link href={`/?d=${addDays(day, 1)}`} aria-label={t("day.next")} className="rounded-lg px-3 py-2 text-muted hover:bg-track">
            →
          </Link>
        )}
      </header>

      <section
        className="relative overflow-hidden rounded-2xl p-5 text-white ring-1 ring-white/10 transition-colors duration-700"
        style={{ backgroundColor: ACTS[actOf(score.total)].sky }}
      >
        <Sky opacity={ACTS[actOf(score.total)].stars} />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="flex items-baseline gap-2">
              <span className="text-7xl font-extrabold leading-none tracking-tighter tabular-nums">{score.total}</span>
              <span className="text-sm text-white/70">{t("day.outOf")}</span>
            </p>
            <p className="mt-2 text-sm font-medium text-white/85">{t(`day.act.${ACTS.length - 1 - actOf(score.total)}` as "day.act.0")}</p>
          </div>
          <Sun score={score.total} />
        </div>
        <div className="relative mt-4 flex">
          <Bar key={touched !== null && score.total === 100 ? "full" : "partial"} fraction={score.total / 100} tone="white" size="md" celebrate={touched !== null && score.total === 100} />
        </div>
        <dl className="relative mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label={t("day.core")} value={`${fmt(Math.round(score.core))}`} />
          <Stat label={t("day.bonus")} value={`+${fmt(Math.round(score.bonus))}`} />
          <Stat label={t("day.penalties")} value={`${Math.round(-score.penalty) > 0 ? "−" : ""}${fmt(Math.abs(Math.round(score.penalty)))}`} />
        </dl>
      </section>

      {overview}

      <section>
        <h2 className="heading">{t("day.lastYear")}</h2>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <Heatmap
            points={history.map((h) => (h.day === day ? { day, score: hasData ? score.total : null } : h))}
            from={history[0].day}
            to={today}
            today={today}
            selected={day}
            months
            f={f}
          />
          <p className="mt-2 text-[10px] text-muted">{t("day.lastYearHelp")}</p>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-bad px-3 py-2 text-sm text-bad">
          {t("day.saveError")}
        </p>
      )}

      {sections.map((section) => {
        const rows = metrics.filter((m) => m.sectionId === section.id);
        if (rows.length === 0) return null;
        return (
          <section key={section.id}>
            <h2 className="heading">{section.name}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {rows.map((m) => (
                <Row
                  key={m.id}
                  metric={m}
                  value={values[m.id]}
                  trend={m.scoring === "trend" ? trend(m, { ...trends[m.id], [day]: values[m.id] }, day) : undefined}
                  lastValue={m.scoring === "trend" ? lastBefore(trends[m.id], day) : undefined}
                  recent={recent[m.id] ?? []}
                  celebrate={touched === m.id}
                  source={values[m.id] === entries[m.id]?.value ? entries[m.id]?.source : undefined}
                  onChange={(v) => update(m.id, v)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      <Note day={day} initial={note} onError={() => setError(true)} />

    </main>
  );
}

// Most recent value logged before the given day.
function lastBefore(series: Series | undefined, day: string): number | undefined {
  const days = Object.keys(series ?? {}).filter((d) => d < day && series![d] !== undefined);
  return days.length ? series![days.sort().at(-1)!] : undefined;
}

function Note({ day, initial, onError }: { day: string; initial: string; onError: () => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [, startTransition] = useTransition();

  function save() {
    if (text.trim() === saved.trim()) return;
    const value = text;
    startTransition(async () => {
      try {
        await saveNote(day, value);
        setSaved(value);
      } catch {
        onError();
      }
    });
  }

  return (
    <section>
      <h2 className="heading">
        <label htmlFor="day-note">{t("day.note")}</label>
      </h2>
      <textarea
        id="day-note"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        maxLength={2000}
        rows={3}
        placeholder={t("day.notePlaceholder")}
        className="w-full resize-y rounded-2xl border border-border bg-surface p-4 text-sm outline-none placeholder:text-muted focus:border-fg"
      />
    </section>
  );
}

// The day in five acts, each starting at its `from` score: night, first light, morning, full day, golden day.
// The sky, the little character's colour and its face all change together.
const ACTS = [
  { from: 80, sky: "#1f6bff", body: "#ffb800", stars: 0, eyes: "M30 39q3-4 6 0M44 39q3-4 6 0", mouth: "M31 46q9 13 18 0Z" },
  { from: 60, sky: "#1a55e3", body: "#ffc21a", stars: 0, eyes: "M33 36v3M47 36v3", mouth: "M32 47q8 9 16 0" },
  { from: 40, sky: "#1238c9", body: "#f0cf6a", stars: 0.25, eyes: "M33 36v3M47 36v3", mouth: "M35 49q5 4 10 0" },
  { from: 20, sky: "#18206a", body: "#c9b98a", stars: 0.6, eyes: "M33 36v3M47 36v3", mouth: "M34 52q6-4 12 0" },
  { from: 0, sky: "#0b1030", body: "#8f9ac4", stars: 1, eyes: "M30 37q3 3 6 0M44 37q3 3 6 0", mouth: "M37 50h6" },
];
const actOf = (score: number) => ACTS.findIndex((a) => score >= a.from);

// Stars are small squares: days still waiting. [right %, top %, size px]
const STARS = [[8, 14, 5], [22, 30, 4], [35, 10, 4], [44, 38, 5], [30, 52, 3], [15, 58, 4], [52, 16, 3]];

function Sky({ opacity }: { opacity: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 transition-opacity duration-700" style={{ opacity }}>
      {STARS.map(([right, top, size], i) => (
        <span key={i} className="absolute rounded-[1px] bg-white" style={{ right: `${right}%`, top: `${top}%`, width: size, height: size }} />
      ))}
    </div>
  );
}

// The app's character: a square at night that rounds off, warms up and rises into a sun as the score grows.
function Sun({ score }: { score: number }) {
  const index = actOf(score);
  const act = ACTS[index];
  const top = index === 0;
  const asleep = index === ACTS.length - 1;
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden border-b-2 border-white/70">
      <svg
        viewBox="0 0 80 80"
        className="h-20 w-20 transition-transform duration-500"
        // Even at zero the face stays above the horizon, so the mood is always readable.
        style={{ transform: `translateY(${(1 - score / 100) * 28}%)` }}
        fill="none"
        stroke="#0b1b4d"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {top && (
          <g className="animate-[spin_14s_linear_infinite] motion-reduce:animate-none" style={{ transformOrigin: "40px 44px" }} stroke="#ffd766" strokeWidth="3">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1="40" y1="14" x2="40" y2="9" transform={`rotate(${deg} 40 44)`} />
            ))}
          </g>
        )}
        <rect
          x="18"
          y="22"
          width="44"
          height="44"
          stroke="none"
          className="transition-all duration-500"
          style={{ rx: `${5 + (score / 100) * 17}px`, fill: act.body }}
        />
        <path d={act.eyes} />
        <path d={act.mouth} fill={top ? "#0b1b4d" : "none"} />
        {asleep && (
          <text x="62" y="22" fontSize="11" fontWeight="700" fill="#ffffff" stroke="none">
            z
            <tspan dx="1" dy="-7" fontSize="8">
              z
            </tspan>
          </text>
        )}
      </svg>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-white/70">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Row({
  metric: m,
  value,
  trend: t,
  lastValue,
  recent,
  celebrate,
  source,
  onChange,
}: {
  metric: Metric;
  value: number | undefined;
  trend: Trend | undefined;
  lastValue: number | undefined;
  recent: (number | null)[];
  celebrate: boolean;
  source: string | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const f = useI18n();
  const fmt = f.num;
  const pts = metricPoints(m, value, t?.fraction);
  const penalty = m.role === "penalty";
  const track = m.role === "track";
  const fraction = progress(m, value, t?.fraction);
  const done = fraction >= 1;
  const amounts = { free: fmt(m.free), target: fmt(m.target), unit: m.unit };
  const hint = t
    ? trendHint(m, t, f)
    : m.input === "number"
      ? f.t(penalty ? (m.free > 0 ? "day.hintPenaltyFree" : "day.hintPenalty") : "day.hintTarget", amounts)
      : m.input === "rating" && !track
        ? f.t("day.hintRating", amounts)
        : "";

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 font-medium">
            {m.name}
            {m.role !== "core" && (
              <span className={`text-[10px] font-normal uppercase tracking-wider ${penalty ? "text-bad" : track ? "text-muted" : "text-good"}`}>
                {f.t(`role.${m.role}`)}
              </span>
            )}
            {SOURCES.map(
              (s) =>
                s === source && (
                  <span key={s} className="rounded bg-track px-1.5 py-0.5 text-[10px] font-normal text-muted">
                    {f.t(`source.${s}`)}
                  </span>
                ),
            )}
          </p>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <div className="shrink-0">
          {m.input === "number" && <NumberField metric={m} value={value} first={t ? (lastValue ?? m.target) : undefined} onChange={onChange} />}
          {m.input === "bool" && (
            <button
              type="button"
              role="switch"
              aria-checked={!!value}
              aria-label={m.name}
              onClick={() => onChange(value ? undefined : 1)}
              className={`h-7 w-12 rounded-full p-0.5 transition-colors ${value ? (penalty ? "bg-bad" : "bg-accent") : "bg-track"}`}
            >
              {/* Off it is a square; on it slides across and becomes the sun. */}
              <span
                className={`block h-6 w-6 transition-all duration-200 ${value ? `translate-x-5 rounded-full ${penalty ? "bg-white" : "bg-sun"}` : "rounded-[5px] bg-surface ring-1 ring-muted/40"}`}
              />
            </button>
          )}
          {m.input === "rating" && (
            <div className="flex gap-1" role="radiogroup" aria-label={m.name}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={value === n}
                  onClick={() => onChange(value === n ? undefined : n)}
                  // The squares before the chosen one are lit; the chosen one is round.
                  className={`h-8 w-8 text-sm tabular-nums transition-[border-radius] ${
                    value === n ? "rounded-full bg-accent font-bold text-on-accent" : value !== undefined && n < value ? "rounded-lg bg-accent/25" : "rounded-lg bg-track text-muted"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {track ? (
          <span className="flex-1" />
        ) : (
          <>
            <Bar key={celebrate && done ? "done" : "open"} fraction={fraction} tone={penalty ? "bad" : "accent"} celebrate={celebrate && done && !penalty} />
            <span className={`w-16 text-right text-xs tabular-nums ${penalty && pts < 0 ? "text-bad" : "text-muted"}`}>
              {pts < 0 ? "−" : ""}{fmt(Math.abs(pts))} / {fmt(m.points)}
            </span>
          </>
        )}
        <Week metric={m} values={[...recent, value ?? null]} label={f.t("day.week7")} />
      </div>
    </li>
  );
}

// The last seven days at a glance, ending on the open day (the round one).
function Week({ metric: m, values, label }: { metric: Metric; values: (number | null)[]; label: string }) {
  const plain = m.role === "track" || m.scoring === "trend";
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className="hidden text-[10px] text-muted sm:inline">{label}</span>
      <div role="img" aria-label={`${label}: ${values.filter((v) => v !== null).length}/7`} className="flex gap-[3px]">
        {values.map((v, i) => {
          const p = v === null ? 0 : plain ? 1 : progress(m, v);
          const last = i === values.length - 1;
          const colour = !plain && m.role !== "penalty" && p >= 1 && last ? "var(--sun)" : m.role === "penalty" ? "var(--bad)" : "var(--accent)";
          return (
            <span
              key={i}
              className={`h-2 w-2 bg-track ${last ? "rounded-full" : "rounded-[2px]"}`}
              style={p > 0 ? { background: `color-mix(in srgb, ${colour} ${Math.max(p, 0.3) * 100}%, var(--track))` } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function trendHint(m: Metric, t: Trend, f: I18n): string {
  const goal = m.target > 0 ? f.t("day.hintTarget", { target: f.num(m.target), unit: m.unit }) : f.t("day.setGoal");
  if (t.average === null) return `${goal} · ${f.t("day.noMeasure7")}`;
  const avg = f.t("day.avg7", { value: f.num(t.average) });
  if (t.previous === null) return `${avg} · ${goal}`;
  const change = Math.round((t.average - t.previous) * 10) / 10;
  const arrow = change > 0 ? `↑ ${f.num(change)}` : change < 0 ? `↓ ${f.num(-change)}` : f.t("day.steady");
  return `${avg} (${arrow} ${f.t("day.fromLastWeek")}) · ${goal}`;
}

function NumberField({
  metric: m,
  value,
  first,
  onChange,
}: {
  metric: Metric;
  value: number | undefined;
  // Value the first tap on + jumps to; defaults to the target.
  first?: number;
  onChange: (v: number | undefined) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const text = draft.trim().replace(",", ".");
    setDraft(null);
    if (text === "") return onChange(undefined);
    const n = Number(text);
    if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n);
  }

  function bump(dir: 1 | -1) {
    if (value === undefined) {
      // First tap on an empty field jumps to the target; penalties start from one step.
      if (dir === 1) onChange(first || (m.role === "penalty" ? m.step : m.target));
      return;
    }
    onChange(Math.max(0, Math.round((value + dir * m.step) * 100) / 100));
  }
  const btn = "h-8 w-8 rounded-lg bg-track text-muted hover:text-fg";

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={t("day.less", { name: m.name })} onClick={() => bump(-1)} className={btn}>
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={`${m.name} (${m.unit})`}
        placeholder="–"
        value={draft ?? (value === undefined ? "" : String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-16 rounded-lg border border-border bg-transparent text-center text-sm tabular-nums outline-none focus:border-fg"
      />
      <button type="button" aria-label={t("day.more", { name: m.name })} onClick={() => bump(1)} className={btn}>
        +
      </button>
    </div>
  );
}
