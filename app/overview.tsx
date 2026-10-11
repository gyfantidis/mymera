import Link from "next/link";
import { GOAL_STATUS_LABELS, type Progress } from "@/lib/goals-shared";
import { formatSigned } from "@/lib/money-shared";

export type TrendSummary = { id: string; name: string; unit: string; target: number; average: number | null; previous: number | null };
export type GoalSummary = { id: string; title: string; progress: Progress };

type Props = {
  trends: TrendSummary[];
  money: { month: string; result: number; balance: number };
  goals: GoalSummary[];
};

const nf = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });
const card = "block rounded-2xl border border-border bg-surface p-4 hover:border-muted";
const STATUS_TEXT: Record<Progress["status"], string> = { done: "text-good", on: "text-good", behind: "text-bad", collecting: "text-muted" };

// Where things stand right now across body, money and goals; each card links to its own page.
export default function Overview({ trends, money, goals }: Props) {
  return (
    <section aria-label="Επισκόπηση" className="grid grid-cols-2 gap-3">
      {trends.map((t) => (
        <Link key={t.id} href="/stats" className={card}>
          <p className="text-xs text-muted">{t.name}</p>
          {t.average === null ? (
            <p className="mt-1 text-sm text-muted">Καμία μέτρηση τις τελευταίες 7 μέρες</p>
          ) : (
            <>
              <p className="text-xl font-semibold tabular-nums">
                {nf.format(t.average)} <span className="text-sm font-normal text-muted">{t.unit}</span>
              </p>
              <p className="text-xs text-muted">
                {change(t)}
                {t.target > 0 && ` · στόχος ${nf.format(t.target)}`}
              </p>
            </>
          )}
        </Link>
      ))}

      <Link href="/money" className={card}>
        <p className="text-xs capitalize text-muted">{money.month}</p>
        <p className={`text-xl font-semibold tabular-nums ${money.result > 0 ? "text-good" : money.result < 0 ? "text-bad" : ""}`}>
          {formatSigned(money.result)}
        </p>
        <p className="text-xs text-muted">υπόλοιπο {formatSigned(money.balance)}</p>
      </Link>

      <Link href="/goals" className={`${card} col-span-2`}>
        <p className="text-xs text-muted">Στόχοι</p>
        {goals.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Δεν έχεις ορίσει στόχους. Πάτα για να φτιάξεις τον πρώτο.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {goals.map(({ id, title, progress: p }) => (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{title}</span>
                  <span className={`shrink-0 text-xs ${STATUS_TEXT[p.status]}`}>{GOAL_STATUS_LABELS[p.status]}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
                  <div className={`h-full rounded-full ${p.status === "behind" ? "bg-bad" : "bg-good"}`} style={{ width: `${(p.fraction ?? 0) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Link>
    </section>
  );
}

function change(t: TrendSummary): string {
  if (t.average === null || t.previous === null) return "μ.ό. 7 ημερών";
  const diff = Math.round((t.average - t.previous) * 10) / 10;
  return diff === 0 ? "σταθερό από την προηγούμενη εβδομάδα" : `${diff > 0 ? "↑" : "↓"} ${nf.format(Math.abs(diff))} από την προηγούμενη εβδομάδα`;
}
