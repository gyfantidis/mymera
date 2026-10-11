"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveEntry } from "./actions";
import type { Entry } from "@/lib/db";
import { addDays, formatDay } from "@/lib/dates";
import { GROUP_LABELS, type Group, type Metric } from "@/lib/metrics";
import { dayScore, metricPoints, progress, type Values } from "@/lib/score";

type Props = {
  day: string;
  isToday: boolean;
  metrics: Metric[];
  entries: Record<string, Entry>;
  history: { day: string; score: number | null }[];
};

const SOURCE_LABELS: Record<string, string> = { health: "Υγεία", mac: "Mac" };
const GROUPS: Group[] = ["core", "bonus", "penalty"];

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function DayView({ day, isToday, metrics, entries, history }: Props) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
  );
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  const score = dayScore(metrics, values);
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
        <Link href={`/?d=${addDays(day, -1)}`} aria-label="Προηγούμενη μέρα" className="rounded-lg px-3 py-2 text-muted hover:bg-track">
          ←
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-semibold capitalize">{formatDay(day)}</h1>
          {isToday && <p className="text-xs text-muted">Σήμερα</p>}
        </div>
        {isToday ? (
          <span className="px-3 py-2 text-transparent">→</span>
        ) : (
          <Link href={`/?d=${addDays(day, 1)}`} aria-label="Επόμενη μέρα" className="rounded-lg px-3 py-2 text-muted hover:bg-track">
            →
          </Link>
        )}
      </header>

      <section className="flex items-center gap-6 rounded-2xl border border-border bg-surface p-5">
        <Ring score={score.total} />
        <dl className="grid flex-1 grid-cols-3 gap-2 text-center text-sm">
          <Stat label="Βάση" value={`${fmt(Math.round(score.core))}`} />
          <Stat label="Μπόνους" value={`+${fmt(Math.round(score.bonus))}`} tone="good" />
          <Stat label="Ποινές" value={`${Math.round(-score.penalty) > 0 ? "−" : ""}${fmt(Math.round(-score.penalty))}`} tone="bad" />
        </dl>
      </section>

      {error && (
        <p role="alert" className="rounded-lg border border-bad px-3 py-2 text-sm text-bad">
          Η τελευταία αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.
        </p>
      )}

      {GROUPS.map((group) => (
        <section key={group}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{GROUP_LABELS[group]}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {metrics
              .filter((m) => m.group === group)
              .map((m) => (
                <Row
                  key={m.key}
                  metric={m}
                  value={values[m.key]}
                  source={values[m.key] === entries[m.key]?.value ? entries[m.key]?.source : undefined}
                  onChange={(v) => update(m.key, v)}
                />
              ))}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Τελευταίες 14 μέρες</h2>
        <div className="flex h-24 items-end gap-1 rounded-2xl border border-border bg-surface p-3">
          {history.map((h) => {
            const s = h.day === day ? (hasData ? score.total : null) : h.score;
            return (
              <Link
                key={h.day}
                href={`/?d=${h.day}`}
                title={`${formatDay(h.day)}: ${s ?? "χωρίς δεδομένα"}`}
                className="flex h-full flex-1 items-end"
              >
                <span
                  className={`w-full rounded-sm ${s === null ? "bg-track" : h.day === day ? "bg-fg" : "bg-good/60"}`}
                  style={{ height: s === null ? "4px" : `${Math.max(6, s)}%` }}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Ring({ score }: { score: number }) {
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
        <span className="text-[10px] text-muted">από 100</span>
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
  source,
  onChange,
}: {
  metric: Metric;
  value: number | undefined;
  source: string | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const pts = metricPoints(m, value);
  const penalty = m.group === "penalty";
  const hint =
    m.input === "number"
      ? penalty
        ? m.free > 0
          ? `ελεύθερα ${fmt(m.free)}, μέγιστη ποινή στα ${fmt(m.target)} ${m.unit}`
          : `μέγιστη ποινή στα ${fmt(m.target)} ${m.unit}`
        : `στόχος ${fmt(m.target)} ${m.unit}`
      : m.input === "rating"
        ? `στόχος ${fmt(m.target)}/5`
        : "";

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            {m.label}
            {source && SOURCE_LABELS[source] && (
              <span className="rounded bg-track px-1.5 py-0.5 text-[10px] font-normal text-muted">{SOURCE_LABELS[source]}</span>
            )}
          </p>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <div className="shrink-0">
          {m.input === "number" && <NumberField metric={m} value={value} onChange={onChange} />}
          {m.input === "bool" && (
            <button
              type="button"
              role="switch"
              aria-checked={!!value}
              aria-label={m.label}
              onClick={() => onChange(value ? undefined : 1)}
              className={`h-7 w-12 rounded-full p-0.5 transition-colors ${value ? (penalty ? "bg-bad" : "bg-good") : "bg-track"}`}
            >
              <span className={`block h-6 w-6 rounded-full bg-surface shadow transition-transform ${value ? "translate-x-5" : ""}`} />
            </button>
          )}
          {m.input === "rating" && (
            <div className="flex gap-1" role="radiogroup" aria-label={m.label}>
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
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${penalty ? "bg-bad" : "bg-good"}`}
            style={{ width: `${progress(m, value) * 100}%` }}
          />
        </div>
        <span className={`w-16 text-right text-xs tabular-nums ${penalty && pts < 0 ? "text-bad" : "text-muted"}`}>
          {pts < 0 ? "−" : ""}{fmt(Math.round(Math.abs(pts) * 10) / 10)} / {m.points}
        </span>
      </div>
    </li>
  );
}

function NumberField({
  metric: m,
  value,
  onChange,
}: {
  metric: Metric;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const text = draft.trim().replace(",", ".");
    setDraft(null);
    if (text === "") return onChange(undefined);
    const n = Number(text);
    if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n);
  }

  const bump = (dir: 1 | -1) => onChange(Math.max(0, Math.round(((value ?? 0) + dir * m.step) * 100) / 100));
  const btn = "h-8 w-8 rounded-lg bg-track text-muted hover:text-fg";

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Λιγότερο: ${m.label}`} onClick={() => bump(-1)} className={btn}>
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={`${m.label} (${m.unit})`}
        placeholder="–"
        value={draft ?? (value === undefined ? "" : String(value))}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="h-8 w-16 rounded-lg border border-border bg-transparent text-center text-sm tabular-nums outline-none focus:border-fg"
      />
      <button type="button" aria-label={`Περισσότερο: ${m.label}`} onClick={() => bump(1)} className={btn}>
        +
      </button>
    </div>
  );
}
