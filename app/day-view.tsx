"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveEntry, saveNote } from "./actions";
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
  note: string;
  // Server-rendered summary of weight, money and goals; absent on past days.
  overview: React.ReactNode;
  history: { day: string; score: number | null }[];
};

// Sources other than manual entry that get a badge next to the value.
const SOURCES = ["health", "mac"] as const;

export default function DayView({ day, today, sections, metrics, entries, trends, note, overview, history }: Props) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
  );
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();
  const isToday = day === today;
  const f = useI18n();
  const { t } = f;
  const fmt = f.num;

  const score = dayScore(metrics, values, day, trends);
  const hasData = Object.values(values).some((v) => v !== undefined);

  function update(metric: string, value: number | undefined) {
    setValues((v) => ({ ...v, [metric]: value }));
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

      <section className="flex items-center gap-6 rounded-2xl border border-border bg-surface p-5">
        <Ring score={score.total} />
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center text-sm">
          <Stat label={t("day.core")} value={`${fmt(Math.round(score.core))}`} />
          <Stat label={t("day.bonus")} value={`+${fmt(Math.round(score.bonus))}`} tone="good" />
          <Stat label={t("day.penalties")} value={`${Math.round(-score.penalty) > 0 ? "−" : ""}${fmt(Math.round(-score.penalty))}`} tone="bad" />
        </dl>
      </section>

      {overview}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("day.lastYear")}</h2>
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
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{section.name}</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {rows.map((m) => (
                <Row
                  key={m.id}
                  metric={m}
                  value={values[m.id]}
                  trend={m.scoring === "trend" ? trend(m, { ...trends[m.id], [day]: values[m.id] }, day) : undefined}
                  lastValue={m.scoring === "trend" ? lastBefore(trends[m.id], day) : undefined}
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
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
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

function Ring({ score }: { score: number }) {
  const { t } = useI18n();
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="stroke-good transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{score}</span>
        <span className="text-[10px] text-muted">{t("day.outOf")}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-lg font-medium tabular-nums ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Row({
  metric: m,
  value,
  trend: t,
  lastValue,
  source,
  onChange,
}: {
  metric: Metric;
  value: number | undefined;
  trend: Trend | undefined;
  lastValue: number | undefined;
  source: string | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const f = useI18n();
  const fmt = f.num;
  const pts = metricPoints(m, value, t?.fraction);
  const penalty = m.role === "penalty";
  const track = m.role === "track";
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
              className={`h-7 w-12 rounded-full p-0.5 transition-colors ${value ? (penalty ? "bg-bad" : "bg-good") : "bg-track"}`}
            >
              <span className={`block h-6 w-6 rounded-full bg-surface shadow transition-transform ${value ? "translate-x-5" : ""}`} />
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
                  className={`h-8 w-8 rounded-lg text-sm tabular-nums ${value === n ? "bg-good text-surface" : "bg-track text-muted"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {!track && (
        <div className="mt-2 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${penalty ? "bg-bad" : "bg-good"}`}
              style={{ width: `${progress(m, value, t?.fraction) * 100}%` }}
            />
          </div>
          <span className={`w-16 text-right text-xs tabular-nums ${penalty && pts < 0 ? "text-bad" : "text-muted"}`}>
            {pts < 0 ? "−" : ""}{fmt(Math.abs(pts))} / {fmt(m.points)}
          </span>
        </div>
      )}
    </li>
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
