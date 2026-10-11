"use client";

import { useState, useTransition } from "react";
import { GOAL_KIND_LABELS, type GoalKind } from "@/lib/goals-shared";
import type { Metric } from "@/lib/metrics";
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
        Είδος στόχου
        <select className={field} value={kind} onChange={(e) => switchKind(e.target.value as GoalKind)}>
          {(Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((k) => (
            <option key={k} value={k}>
              {GOAL_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Τι αφορά
        <select className={field} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {options.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          {kind === "reach" && <option value={BALANCE}>Υπόλοιπο χρημάτων</option>}
        </select>
      </label>

      {kind === "change" && (
        <div className="grid grid-cols-2 gap-3">
          <label>
            Κατεύθυνση
            <select className={field} value={direction} onChange={(e) => setDirection(e.target.value as "down" | "up")}>
              <option value="down">Μείωση</option>
              <option value="up">Αύξηση</option>
            </select>
          </label>
          <label>
            Κατά (%)
            <input className={field} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
          </label>
        </div>
      )}
      {kind === "reach" && (
        <div className="grid grid-cols-2 gap-3">
          <label>
            Τιμή-στόχος {subject === BALANCE ? "(€)" : metric?.unit ? `(${metric.unit})` : ""}
            <input className={field} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label>
            Μέχρι (προαιρετικά)
            <input className={field} type="date" min={tomorrow} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
        </div>
      )}
      {kind === "frequency" && (
        <label>
          Φορές την εβδομάδα
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
        {kind === "change" && "Συγκρίνει τον μέσο όρο των τελευταίων 7 ημερών με τον μέσο όρο των 30 ημερών πριν ξεκινήσει ο στόχος."}
        {kind === "reach" && "Μετράει από εκεί που είσαι σήμερα. Με ημερομηνία, δείχνει και αν είσαι εντός προγράμματος."}
        {kind === "frequency" && "Μετράει τις μέρες της εβδομάδας, Δευτέρα έως Κυριακή, που έπιασες τον στόχο του τομέα."}
      </p>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={!valid || pending} className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-40">
          {pending ? "Προσθήκη…" : "Προσθήκη στόχου"}
        </button>
        {error && (
          <span role="alert" className="text-sm text-bad">
            Δεν αποθηκεύτηκε. Έλεγξε τα πεδία.
          </span>
        )}
      </div>
    </form>
  );
}
