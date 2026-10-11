"use client";

import { useState, useTransition } from "react";
import { KIND_LABELS, type Category, type Kind } from "@/lib/money-shared";
import { saveMoneySettings } from "../actions";

const field = "h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-fg outline-none focus:border-fg";
const smallBtn = "shrink-0 rounded-lg bg-track px-2 py-1 text-xs text-muted hover:text-fg";

export default function CategoriesForm({ categories, opening }: { categories: Category[]; opening: number }) {
  const [list, setList] = useState(categories);
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(String(opening));
  const [status, setStatus] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const amount = Number(balance.replace(",", "."));
  const invalid = balance.trim() === "" || !Number.isFinite(amount) || list.some((c) => !c.name.trim());

  const patch = (id: string, change: Partial<Category>) => {
    setList((l) => l.map((c) => (c.id === id ? { ...c, ...change } : c)));
    setStatus("dirty");
  };

  function add(kind: Kind) {
    const id = `c_${crypto.randomUUID().slice(0, 8)}`;
    setList([...list, { id, name: "", kind, archived: false }]);
    setCreated(new Set(created).add(id));
    setStatus("dirty");
  }

  // Categories that were never saved are dropped; saved ones are archived so past entries keep their name.
  function remove(c: Category) {
    if (created.has(c.id)) {
      setList(list.filter((x) => x.id !== c.id));
      setStatus("dirty");
    } else patch(c.id, { archived: true });
  }

  function save() {
    startTransition(async () => {
      try {
        await saveMoneySettings(list, amount);
        setCreated(new Set());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const archived = list.filter((c) => c.archived);

  return (
    <div className="flex flex-col gap-6 pb-20">
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
          <label htmlFor="opening">Αρχικό υπόλοιπο (€)</label>
        </h2>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <input
            id="opening"
            className={`${field} max-w-40`}
            inputMode="decimal"
            value={balance}
            onChange={(e) => {
              setBalance(e.target.value);
              setStatus("dirty");
            }}
          />
          <p className="mt-2 text-xs text-muted">
            Τα χρήματα που είχες πριν από την πρώτη κίνηση που θα γράψεις. Το τρέχον υπόλοιπο ξεκινάει από εδώ.
          </p>
        </div>
      </section>

      {(["expense", "income"] as Kind[]).map((kind) => (
        <section key={kind}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Κατηγορίες: {KIND_LABELS[kind]}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {list
              .filter((c) => c.kind === kind && !c.archived)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-2 p-3">
                  <input
                    aria-label="Όνομα κατηγορίας"
                    className={`${field} ${c.name.trim() ? "" : "border-bad"}`}
                    value={c.name}
                    maxLength={60}
                    placeholder="Όνομα κατηγορίας"
                    onChange={(e) => patch(c.id, { name: e.target.value })}
                  />
                  <button type="button" className={smallBtn} onClick={() => remove(c)}>
                    {created.has(c.id) ? "Διαγραφή" : "Αρχειοθέτηση"}
                  </button>
                </li>
              ))}
            <li className="p-3">
              <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => add(kind)}>
                + Νέα κατηγορία
              </button>
            </li>
          </ul>
        </section>
      ))}

      {archived.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Αρχειοθετημένες</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3">
                <span>
                  {c.name} <span className="text-xs text-muted">· {KIND_LABELS[c.kind]}</span>
                </span>
                <button type="button" className={smallBtn} onClick={() => patch(c.id, { archived: false })}>
                  Επαναφορά
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Δεν εμφανίζονται στη νέα κίνηση, αλλά οι παλιές κινήσεις τους μένουν.</p>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || invalid || status === "idle" || status === "saved"}
            className="rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
          >
            {pending ? "Αποθήκευση…" : "Αποθήκευση"}
          </button>
          <span role="status" className="text-sm">
            {invalid && <span className="text-bad">Συμπλήρωσε τα πεδία με κόκκινο.</span>}
            {!invalid && status === "dirty" && <span className="text-muted">Υπάρχουν αλλαγές που δεν αποθηκεύτηκαν.</span>}
            {!invalid && status === "saved" && <span className="text-good">Αποθηκεύτηκε.</span>}
            {!invalid && status === "error" && <span className="text-bad">Δεν αποθηκεύτηκε.</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
