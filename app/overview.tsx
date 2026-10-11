import Link from "next/link";
import EmptyState from "./empty-state";
import GoalBlocks from "./goals/goal-blocks";
import type { GoalKind, Progress } from "@/lib/goals-shared";
import type { I18n } from "@/lib/i18n";

export type TrendSummary = { id: string; name: string; unit: string; target: number; average: number | null; previous: number | null };
export type GoalSummary = { id: string; title: string; kind: GoalKind; progress: Progress };

type Props = {
  trends: TrendSummary[];
  money: { month: string; result: number; balance: number };
  goals: GoalSummary[];
  f: I18n;
};

const card = "block rounded-2xl border border-border bg-surface p-4 hover:border-muted";
const STATUS_TEXT: Record<Progress["status"], string> = { done: "text-good", on: "text-good", behind: "text-bad", collecting: "text-muted" };

// Where things stand right now across body, money and goals; each card links to its own page.
export default function Overview({ trends, money, goals, f }: Props) {
  const { t: tr } = f;
  return (
    <section aria-label={tr("overview.label")} className="grid grid-cols-2 gap-3">
      {trends.map((t) => (
        <Link key={t.id} href="/stats" className={card}>
          <p className="text-xs text-muted">{t.name}</p>
          {t.average === null ? (
            <p className="mt-1 text-sm text-muted">{tr("overview.noMeasure")}</p>
          ) : (
            <>
              <p className="text-xl font-semibold tabular-nums">
                {f.num(t.average)} <span className="text-sm font-normal text-muted">{t.unit}</span>
              </p>
              <p className="text-xs text-muted">
                {change(t, f)}
                {t.target > 0 && ` · ${tr("overview.target", { value: f.num(t.target) })}`}
              </p>
            </>
          )}
        </Link>
      ))}

      <Link href="/money" className={card}>
        <p className="text-xs capitalize text-muted">{money.month}</p>
        <p className={`text-xl font-semibold tabular-nums ${money.result > 0 ? "text-good" : money.result < 0 ? "text-bad" : ""}`}>
          {f.signed(money.result)}
        </p>
        <p className="text-xs text-muted">{tr("overview.balance", { value: f.signed(money.balance) })}</p>
      </Link>

      <Link href="/goals" className={`${card} col-span-2`}>
        <p className="text-xs text-muted">{tr("nav.goals")}</p>
        {goals.length === 0 ? (
          <EmptyState bare>{tr("overview.noGoals")}</EmptyState>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {goals.map(({ id, title, kind, progress: p }) => (
              <li key={id}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{title}</span>
                  <span className={`shrink-0 text-xs ${STATUS_TEXT[p.status]}`}>{tr(`goals.status.${p.status}`)}</span>
                </div>
                <div className="mt-1.5">
                  <GoalBlocks kind={kind} progress={p} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Link>
    </section>
  );
}

function change(t: TrendSummary, f: I18n): string {
  if (t.average === null || t.previous === null) return f.t("overview.avg7");
  const diff = Math.round((t.average - t.previous) * 10) / 10;
  return diff === 0 ? f.t("overview.steady") : f.t("overview.change", { arrow: diff > 0 ? "↑" : "↓", value: f.num(Math.abs(diff)) });
}
