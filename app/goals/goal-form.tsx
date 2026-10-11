"use client";

import { useState, useTransition } from "react";
import { GOAL_KINDS, type GoalKind } from "@/lib/goals-shared";
import type { Metric } from "@/lib/metrics";
import { useI18n } from "../locale-provider";
import { createGoal, type GoalInput } from "./actions";

const BALANCE = "__balance";
const field = "h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-fg outline-none focus:border-fg";

// Which metrics each kind of goal can be about.
const allowed: Record<GoalKind, (m: Metric) => boolean> = {
  change: (m) => m.input === "number" && m.scoring === "daily",
  reach: (m) => m.input !== "bool",
  frequency: (m) => m.role !== "penalty",
};

export default function GoalForm({ metrics, tomorrow }: { metrics: Metric[]; tomorrow: string }) {
  const [kind, setKind] = useState<GoalKind>("frequency");
  const options = metrics.filter(allowed[kind]);
  const [subject, setSubject] = useState(options[0]?.id ?? "");
  const [direction, setDirection] = useState<"down" | "up">("down");
  const [percent, setPercent] = useState("15");
  const [target, setTarget] = useState("");
  const [due, setDue] = useState("");
  const [perWeek, setPerWeek] = useState("4");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
  const metric = metrics.find((m) => m.id === subject);
  const valid =
    subject !== "" &&
    (kind === "change" ? num(percent) > 0 && num(percent) <= (direction === "down" ? 100 : 1000) : kind === "reach" ? Number.isFinite(num(target)) : true);

  function switchKind(next: GoalKind) {
    setKind(next);
    setSubject(metrics.find(allowed[next])?.id ?? (next === "reach" ? BALANCE : ""));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const input: GoalInput =
      kind === "change"
        ? { kind, metricId: subject, percent: direction === "down" ? -num(percent) : num(percent) }
        : kind === "reach"
          ? { kind, metricId: subject === BALANCE ? null : subject, targetValue: num(target), dueDay: due || null }
          : { kind, metricId: subject, perWeek: Number(perWeek) };
    setError(false);
    startTransition(async () => {
      try {
        await createGoal(input);
        setTarget("");
        setDue("");
      } catch {
        setError(true);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-xs text-muted">
      <label>
        {t("goals.form.kind")}
        <select className={field} value={kind} onChange={(e) => switchKind(e.target.value as GoalKind)}>
          {GOAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`goals.kind.${k}`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("goals.form.subject")}
        <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          {kind === "reach" && <option value={BALANCE}>{t("goals.balance")}</option>}
        </select>
      </label>

      {kind === "change" && (
        <div className="grid grid-cols-2 gap-3">
          <label>
            {t("goals.form.direction")}
            <select className={field} value={direction} onChange={(e) => setDirection(e.target.value as "down" | "up")}>
              <option value="down">{t("goals.form.down")}</option>
              <option value="up">{t("goals.form.up")}</option>
            </select>
          </label>
          <label>
            {t("goals.form.by")}
            <input className={field} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </label>
        </div>
      )}
      {kind === "reach" && (
        <div className="grid grid-cols-2 gap-3">
          <label>
            {t("goals.form.target")} {subject === BALANCE ? "(€)" : metric?.unit ? `(${metric.unit})` : ""}
            <input className={field} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label>
            {t("goals.form.due")}
            <input className={field} type="date" min={tomorrow} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
      )}
      {kind === "frequency" && (
        <label>
          {t("goals.form.perWeek")}
          <select className={field} value={perWeek} onChange={(e) => setPerWeek(e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      <p>
        {kind === "change" && t("goals.form.helpChange")}
        {kind === "reach" && t("goals.form.helpReach")}
        {kind === "frequency" && t("goals.form.helpFrequency")}
      </p>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!valid || pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-40">
          {pending ? t("adding") : t("goals.form.submit")}
        </button>
        {error && (
          <span role="alert" className="text-sm text-bad">
            {t("goals.form.error")}
          </span>
        )}
      </div>
    </form>
  );
}
