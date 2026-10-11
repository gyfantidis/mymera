"use client";

import { useState, useTransition } from "react";
import { saveOverrides } from "../actions";
import { DEFAULT_METRICS, GROUP_LABELS, type Group, type Metric, type Overrides } from "@/lib/metrics";

type Field = "target" | "free" | "points";
type Draft = Record<string, Record<Field, string>>;

const GROUPS: Group[] = ["core", "bonus", "penalty"];

const toDraft = (metrics: Metric[]): Draft =>
  Object.fromEntries(metrics.map((m) => [m.key, { target: String(m.target), free: String(m.free), points: String(m.points) }]));

export default function SettingsForm({ metrics }: { metrics: Metric[] }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(metrics));
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const num = (key: string, f: Field) => Number(draft[key][f].replace(",", "."));
  const coreSum = metrics.filter((m) => m.group === "core").reduce((s, m) => s + (num(m.key, "points") || 0), 0);
  const invalid = metrics.some((m) =>
    (["target", "free", "points"] as const).some((f) => draft[m.key][f].trim() === "" || !(num(m.key, f) >= 0)),
  );

  function set(key: string, f: Field, v: string) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [f]: v } }));
    setStatus("idle");
  }

  function save() {
    const overrides: Overrides = Object.fromEntries(
      metrics.map((m) => [m.key, { target: num(m.key, "target"), free: num(m.key, "free"), points: num(m.key, "points") }]),
    );
    startTransition(async () => {
      try {
        await saveOverrides(overrides);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const input = "h-8 w-full rounded-lg border border-border bg-transparent px-2 text-right text-sm tabular-nums outline-none focus:border-fg";

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <section key={group}>
          <h2 className="mb-2 flex justify-between text-xs font-medium uppercase tracking-wider text-muted">
            {GROUP_LABELS[group]}
            {group === "core" && (
              <span className={`normal-case tracking-normal ${coreSum === 100 ? "" : "text-bad"}`}>
                Σύνολο πόντων: {coreSum}
                {coreSum !== 100 && " (προτείνεται 100)"}
              </span>
            )}
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {metrics
              .filter((m) => m.group === group)
              .map((m) => (
                <li key={m.key} className="px-4 py-3">
                  <p className="mb-2 font-medium">{m.label}</p>
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted">
                    {m.input !== "bool" ? (
                      <label>
                        {group === "penalty" ? "Μέγιστη ποινή στα" : "Στόχος"} {m.unit && `(${m.unit})`}
                        <input className={input} inputMode="decimal" value={draft[m.key].target} onChange={(e) => set(m.key, "target", e.target.value)} />
                      </label>
                    ) : (
                      <span />
                    )}
                    {group === "penalty" && m.input === "number" ? (
                      <label>
                        Ελεύθερα ({m.unit})
                        <input className={input} inputMode="decimal" value={draft[m.key].free} onChange={(e) => set(m.key, "free", e.target.value)} />
                      </label>
                    ) : (
                      <span />
                    )}
                    <label>
                      Πόντοι
                      <input className={input} inputMode="decimal" value={draft[m.key].points} onChange={(e) => set(m.key, "points", e.target.value)} />
                    </label>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || invalid}
          className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {pending ? "Αποθήκευση…" : "Αποθήκευση"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(toDraft(DEFAULT_METRICS));
            setStatus("idle");
          }}
          className="rounded-lg px-3 py-2 text-sm text-muted hover:text-fg"
        >
          Επαναφορά προεπιλογών
        </button>
        <span role="status" className="text-sm">
          {invalid && <span className="text-bad">Συμπλήρωσε όλα τα πεδία με αριθμούς ≥ 0.</span>}
          {!invalid && status === "saved" && <span className="text-good">Αποθηκεύτηκε.</span>}
          {!invalid && status === "error" && <span className="text-bad">Δεν αποθηκεύτηκε.</span>}
        </span>
      </div>
    </div>
  );
}
