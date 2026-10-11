"use client";

import { useState, useTransition } from "react";
import type { Category, Kind } from "@/lib/money-shared";
import { useI18n } from "../locale-provider";
import { createTransaction } from "./actions";

const field = "h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-fg outline-none focus:border-fg";

export default function AddForm({ categories, defaultDay, min, max }: { categories: Category[]; defaultDay: string; min: string; max: string }) {
  const [kind, setKind] = useState<Kind>("expense");
  const options = categories.filter((c) => c.kind === kind);
  const [categoryId, setCategoryId] = useState(options[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  const value = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && value > 0 && categoryId !== "" && day !== "";

  function switchKind(next: Kind) {
    setKind(next);
    setCategoryId(categories.find((c) => c.kind === next)?.id ?? "");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(false);
    startTransition(async () => {
      try {
        await createTransaction(day, categoryId, value, note);
        setAmount("");
        setNote("");
      } catch {
        setError(true);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div role="radiogroup" aria-label={t("money.kindLabel")} className="flex gap-1 rounded-xl bg-track p-1">
        {(["expense", "income"] as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => switchKind(k)}
            className={`flex-1 rounded-lg py-1.5 text-sm ${kind === k ? "bg-surface font-medium shadow-sm" : "text-muted"}`}
          >
            {t(`kind.${k}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-muted">
        <label>
          {t("money.category")}
          <select className={field} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("money.amount")}
          <input className={field} inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          {t("money.date")}
          <input className={field} type="date" min={min} max={max} value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          {t("money.noteOptional")}
          <input className={field} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={!valid || pending} className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-40">
          {t(pending ? "adding" : "add")}
        </button>
        {error && (
          <span role="alert" className="text-sm text-bad">
            {t("notSavedRetry")}
          </span>
        )}
      </div>
    </form>
  );
}
