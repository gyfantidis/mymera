import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { addDays, dayOf } from "@/lib/dates";
import { balanceAt, getCategories, getTransactions, monthlyTotals } from "@/lib/money";
import { getI18n } from "@/lib/i18n/server";
import { totalsByCategory } from "@/lib/money-shared";
import MoneyNav, { Card, tone } from "../money-nav";
import LoadingText from "../../loading-text";

export default function Page({ searchParams }: PageProps<"/money/year">) {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<LoadingText />}>
        <Year searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Year({ searchParams }: Pick<PageProps<"/money/year">, "searchParams">) {
  const { y } = await searchParams;
  const f = await getI18n();
  const { t } = f;
  await connection();
  const today = dayOf(new Date());
  const thisYear = Number(today.slice(0, 4));
  const year = typeof y === "string" && /^\d{4}$/.test(y) && Number(y) <= thisYear ? Number(y) : thisYear;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const lastMonth = year === thisYear ? Number(today.slice(5, 7)) : 12;

  const [totals, categories, transactions, opening] = await Promise.all([
    monthlyTotals(from, to),
    getCategories(),
    getTransactions(from, to),
    balanceAt(addDays(from, -1)),
  ]);
  const byMonth = new Map(totals.map((t) => [t.month, t]));
  let balance = opening;
  const rows = Array.from({ length: lastMonth }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    const { income = 0, expense = 0 } = byMonth.get(month) ?? {};
    balance += income - expense;
    return { month, income, expense, result: income - expense, balance };
  });
  const income = rows.reduce((s, r) => s + r.income, 0);
  const expense = rows.reduce((s, r) => s + r.expense, 0);
  const result = income - expense;
  const expenses = totalsByCategory(categories, transactions, "expense");
  const arrow = "rounded-lg px-3 py-2 text-muted hover:bg-track";
  const cell = "px-2 py-2 text-right tabular-nums";

  return (
    <>
      <MoneyNav active="year" f={f} />
      <header className="flex items-center justify-between">
        <Link href={`/money/year?y=${year - 1}`} aria-label={t("money.prevYear")} className={arrow}>
          ←
        </Link>
        <h1 className="text-lg font-semibold">{year}</h1>
        {year === thisYear ? (
          <span className="px-3 py-2 text-transparent">→</span>
        ) : (
          <Link href={`/money/year?y=${year + 1}`} aria-label={t("money.nextYear")} className={arrow}>
            →
          </Link>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <Card label={t("kind.income")} value={f.money(income)} />
        <Card label={t("kind.expense")} value={f.money(expense)}>
          {t("money.perMonthAvg", { amount: f.money(expense / lastMonth) })}
        </Card>
        <Card label={t("money.yearResult")} value={f.signed(result)} tone={tone(result)}>
          {t("money.incomeMinusExpense")}
        </Card>
        <Card label={t(year === thisYear ? "money.currentBalance" : "money.balanceYearEnd")} value={f.signed(balance)} tone={tone(balance)}>
          {t("money.startedYearAt", { amount: f.signed(opening) })}
        </Card>
      </dl>

      <section>
        <h2 className="heading">{t("money.byMonth")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-3 py-2 text-left font-normal">{t("period.month")}</th>
                <th className={`${cell} font-normal`}>{t("kind.income")}</th>
                <th className={`${cell} font-normal`}>{t("kind.expense")}</th>
                <th className={`${cell} font-normal`}>{t("money.col.result")}</th>
                <th className={`${cell} pr-3 font-normal`}>{t("money.col.balance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border border-t border-border">
              {rows.map((r) => (
                <tr key={r.month}>
                  <th className="px-3 py-2 text-left font-medium">
                    <Link href={`/money?m=${r.month}`} className="capitalize underline-offset-2 hover:underline">
                      {f.month(`${r.month}-01`)}
                    </Link>
                  </th>
                  <td className={cell}>{f.money(r.income)}</td>
                  <td className={cell}>{f.money(r.expense)}</td>
                  <td className={`${cell} ${r.result > 0 ? "text-good" : r.result < 0 ? "text-bad" : ""}`}>{f.signed(r.result)}</td>
                  <td className={`${cell} pr-3`}>{f.signed(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {expenses.length > 0 && (
        <section>
          <h2 className="heading">{t("money.yearExpenses")}</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {expenses.map(({ category, total }) => (
              <li key={category.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{category.name}</span>
                  <span className="tabular-nums">
                    {f.money(total)} <span className="text-xs text-muted">{Math.round((total / expense) * 100)}%</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                  <div className="h-full rounded-full bg-bad" style={{ width: `${(total / expenses[0].total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
