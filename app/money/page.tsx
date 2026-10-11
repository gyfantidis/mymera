import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { dayOf, formatDay } from "@/lib/dates";
import { balanceAt, getCategories, getTransactions } from "@/lib/money";
import { formatMoney, formatSigned, isMonth, totalsByCategory, type CategoryTotal } from "@/lib/money-shared";
import { periodLabel, periodRange, shiftPeriod } from "@/lib/periods";
import AddForm from "./add-form";
import DeleteButton from "./delete-button";
import MoneyNav, { Card, tone } from "./money-nav";

export default function Page({ searchParams }: PageProps<"/money">) {
  return (
    <main className="flex flex-col gap-6">
      <MoneyNav active="month" />
      <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
        <Month searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Month({ searchParams }: Pick<PageProps<"/money">, "searchParams">) {
  const { m } = await searchParams;
  await connection();
  const today = dayOf(new Date());
  const thisMonth = today.slice(0, 7);
  const month = isMonth(m) && m <= thisMonth ? m : thisMonth;
  const { from, to } = periodRange("month", `${month}-01`);
  const isCurrent = month === thisMonth;
  const lastDay = isCurrent ? today : to;

  const [categories, transactions, balance] = await Promise.all([getCategories(), getTransactions(from, to), balanceAt(lastDay)]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const expenses = totalsByCategory(categories, transactions, "expense");
  const incomes = totalsByCategory(categories, transactions, "income");
  const sum = (rows: CategoryTotal[]) => rows.reduce((s, r) => s + r.total, 0);
  const income = sum(incomes);
  const expense = sum(expenses);
  const result = income - expense;

  const days = [...new Set(transactions.map((t) => t.day))];
  const arrow = "rounded-lg px-3 py-2 text-muted hover:bg-track";

  return (
    <>
      <header className="flex items-center justify-between">
        <Link href={`/money?m=${shiftPeriod("month", from, -1).slice(0, 7)}`} aria-label="Προηγούμενος μήνας" className={arrow}>
          ←
        </Link>
        <h1 className="text-lg font-semibold capitalize">{periodLabel("month", from, to)}</h1>
        {isCurrent ? (
          <span className="px-3 py-2 text-transparent">→</span>
        ) : (
          <Link href={`/money?m=${shiftPeriod("month", from, 1).slice(0, 7)}`} aria-label="Επόμενος μήνας" className={arrow}>
            →
          </Link>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <Card label="Έσοδα" value={formatMoney(income)} />
        <Card label="Έξοδα" value={formatMoney(expense)} />
        <Card label="Αποτέλεσμα μήνα" value={formatSigned(result)} tone={tone(result)}>
          έσοδα μείον έξοδα
        </Card>
        <Card label={isCurrent ? "Τρέχον υπόλοιπο" : "Υπόλοιπο στο τέλος του μήνα"} value={formatSigned(balance)} tone={tone(balance)}>
          μαζί με τους προηγούμενους μήνες
        </Card>
      </dl>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Νέα κίνηση</h2>
        <AddForm key={month} categories={categories.filter((c) => !c.archived)} defaultDay={lastDay} min={from} max={lastDay} />
      </section>

      <Breakdown title="Πού πήγαν τα έξοδα" rows={expenses} total={expense} bar="bg-bad" />
      <Breakdown title="Από πού ήρθαν τα έσοδα" rows={incomes} total={income} bar="bg-good" />

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Κινήσεις</h2>
        {transactions.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">Δεν υπάρχουν κινήσεις αυτόν τον μήνα.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {days.map((day) => (
              <div key={day}>
                <h3 className="mb-1 text-xs capitalize text-muted">{formatDay(day)}</h3>
                <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                  {transactions
                    .filter((t) => t.day === day)
                    .map((t) => {
                      const category = byId.get(t.categoryId);
                      const isIncome = category?.kind === "income";
                      const name = category?.name ?? "—";
                      return (
                        <li key={t.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{name}</p>
                            {t.note && <p className="truncate text-xs text-muted">{t.note}</p>}
                          </div>
                          <span className={`shrink-0 text-sm tabular-nums ${isIncome ? "text-good" : ""}`}>
                            {isIncome ? "+" : "−"}
                            {formatMoney(t.amount)}
                          </span>
                          <DeleteButton id={t.id} label={`${name} ${formatMoney(t.amount)}`} />
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Breakdown({ title, rows, total, bar }: { title: string; rows: CategoryTotal[]; total: number; bar: string }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{title}</h2>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {rows.map(({ category, total: amount }) => (
          <li key={category.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{category.name}</span>
              <span className="tabular-nums">
                {formatMoney(amount)} <span className="text-xs text-muted">{Math.round((amount / total) * 100)}%</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${(amount / rows[0].total) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
