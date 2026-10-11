import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig, getRange } from "@/lib/db";
import { addDays, dayOf } from "@/lib/dates";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getGoals } from "@/lib/goals";
import { GOAL_LOOKBACK, goalAmount, goalProgress, goalTitle, type Goal, type Progress } from "@/lib/goals-shared";
import { scoringMetrics, type Metric } from "@/lib/metrics";
import { balanceAt } from "@/lib/money";
import { seriesOf } from "@/lib/stats";
import DeleteGoal from "./delete-goal";
import GoalForm from "./goal-form";
import LoadingText from "../loading-text";

export default function Page() {
  return (
    <main className="flex flex-col gap-6">
      <Suspense fallback={<LoadingText />}>
        <Goals />
      </Suspense>
    </main>
  );
}

const BADGES: Record<Progress["status"], string> = {
  done: "bg-accent text-on-accent",
  on: "bg-track text-good",
  behind: "bg-track text-bad",
  collecting: "bg-track text-muted",
};

async function Goals() {
  await connection();
  const today = dayOf(new Date());
  const [goals, config, f] = await Promise.all([getGoals(), getConfig(), getI18n()]);
  const { t } = f;
  const metrics = scoringMetrics(config);
  const earliest = goals.reduce((d, g) => (g.startDay < d ? g.startDay : d), today);
  const [range, balance] = await Promise.all([
    getRange(addDays(earliest, -GOAL_LOOKBACK), today),
    goals.some((g) => g.metricId === null) ? balanceAt(today) : 0,
  ]);

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">{t("goals.title")}</h1>
        <p className="text-sm text-muted">{t("goals.intro")}</p>
      </div>
      {goals.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">{t("goals.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const metric = metrics.find((m) => m.id === goal.metricId);
            // The metric was archived or removed after the goal was made.
            if (goal.metricId !== null && !metric) return <Orphan key={goal.id} goal={goal} f={f} />;
            const progress = goalProgress(goal, metric, metric ? seriesOf(range, metric.id) : {}, balance, today);
            return <GoalCard key={goal.id} goal={goal} metric={metric} progress={progress} f={f} />;
          })}
        </ul>
      )}

      <section>
        <h2 className="heading">{t("goals.new")}</h2>
        <GoalForm metrics={metrics} tomorrow={addDays(today, 1)} />
      </section>
    </>
  );
}

function detail(goal: Goal, metric: Metric | undefined, p: Progress, f: I18n): string {
  const { t } = f;
  const amount = (n: number) => goalAmount(n, metric, f);
  if (goal.kind === "frequency") {
    const streak = p.streak ? ` · ${f.plural(p.streak, "goals.streak.one", "goals.streak.other")}` : "";
    return t("goals.freqDetail", { done: p.current!, need: p.target! }) + streak;
  }
  if (goal.kind === "change") {
    if (p.start === null) return t("goals.needBaseline", { need: p.need!, have: p.have! });
    const range = t("goals.changeRange", { start: amount(p.start), target: amount(p.target!) });
    return `${p.current === null ? t("goals.noEntry7") : t("goals.avg7", { value: amount(p.current) })} · ${range}`;
  }
  if (p.current === null || p.start === null) return t("goals.noMeasurement");
  const rest = p.status === "done" ? t("goals.reached") : t("goals.left", { amount: amount(Math.abs(p.target! - p.current)) });
  const due = goal.dueDay ? ` · ${t("goals.due", { date: f.day(goal.dueDay) })}` : "";
  return t("goals.reachDetail", { current: amount(p.current), start: amount(p.start), rest }) + due;
}

function GoalCard({ goal, metric, progress: p, f }: { goal: Goal; metric: Metric | undefined; progress: Progress; f: I18n }) {
  const name = goalTitle(goal, metric, f);
  return (
    <li className="rounded-2xl border border-border bg-surface py-3 pl-4 pr-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted">{detail(goal, metric, p, f)}</p>
        </div>
        <DeleteGoal id={goal.id} label={name} />
      </div>
      <div className="mt-3 flex items-center gap-3 pr-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div className={`h-full rounded-full ${p.status === "behind" ? "bg-bad" : "bg-accent"}`} style={{ width: `${(p.fraction ?? 0) * 100}%` }} />
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGES[p.status]}`}>{f.t(`goals.status.${p.status}`)}</span>
      </div>
    </li>
  );
}

function Orphan({ goal, f }: { goal: Goal; f: I18n }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface py-3 pl-4 pr-2">
      <p className="text-sm text-muted">{f.t("goals.orphan")}</p>
      <DeleteGoal id={goal.id} label={f.t("goals.orphanLabel")} />
    </li>
  );
}
