"use client";

import { useState, useTransition } from "react";
import type { Category, Kind } from "@/lib/money-shared";
import { useI18n } from "../../locale-provider";
import { saveMoneySettings } from "../actions";

const field = "h-9 w-full rounded-lg border border-border bg-transparent px-2 text-sm text-fg outline-none focus:border-fg";
const smallBtn = "shrink-0 rounded-lg bg-track px-2 py-1 text-xs text-muted hover:text-fg";

export default function CategoriesForm({ categories, opening }: { categories: Category[]; opening: number }) {
  const [list, setList] = useState(categories);
  const [created, setCreated] = useState<Set<string>>(new Set());
  const [balance, setBalance] = useState(String(opening));
  const [status, setStatus] = useState<"idle" | "dirty" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

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
          <label htmlFor="opening">{t("money.opening")}</label>
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
            {t("money.openingHelp")}
          </p>
        </div>
      </section>

      {(["expense", "income"] as Kind[]).map((kind) => (
        <section key={kind}>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("money.categoriesOf", { kind: t(`kind.${kind}`) })}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {list
              .filter((c) => c.kind === kind && !c.archived)
              .map((c) => (
                <li key={c.id} className="flex items-center gap-2 p-3">
                  <input
                    aria-label={t("money.categoryName")}
                    className={`${field} ${c.name.trim() ? "" : "border-bad"}`}
                    value={c.name}
                    maxLength={60}
                    placeholder={t("money.categoryName")}
                    onChange={(e) => patch(c.id, { name: e.target.value })}
                  />
                  <button type="button" className={smallBtn} onClick={() => remove(c)}>
                    {t(created.has(c.id) ? "delete" : "archive")}
                  </button>
                </li>
              ))}
            <li className="p-3">
              <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => add(kind)}>
                {t("money.addCategory")}
              </button>
            </li>
          </ul>
        </section>
      ))}

      {archived.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("money.archived")}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
            {archived.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3">
                <span>
                  {c.name} <span className="text-xs text-muted">· {t(`kind.${c.kind}`)}</span>
                </span>
                <button type="button" className={smallBtn} onClick={() => patch(c.id, { archived: false })}>
                  {t("restore")}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">{t("money.archivedHelp")}</p>
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
            {t(pending ? "saving" : "save")}
          </button>
          <span role="status" className="text-sm">
            {invalid && <span className="text-bad">{t("fillRed")}</span>}
            {!invalid && status === "dirty" && <span className="text-muted">{t("unsaved")}</span>}
            {!invalid && status === "saved" && <span className="text-good">{t("saved")}</span>}
            {!invalid && status === "error" && <span className="text-bad">{t("notSaved")}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
