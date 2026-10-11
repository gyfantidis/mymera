import { connection } from "next/server";
import { Suspense } from "react";
import { getConfig, getRange } from "@/lib/db";
import { addDays, dayOf, formatDay } from "@/lib/dates";
import { getGoals } from "@/lib/goals";
import { GOAL_LOOKBACK, goalProgress, type Goal, type Progress } from "@/lib/goals-shared";
import { scoringMetrics, type Metric } from "@/lib/metrics";
import { balanceAt } from "@/lib/money";
import { formatMoney } from "@/lib/money-shared";
import { seriesOf } from "@/lib/stats";
import DeleteGoal from "./delete-goal";
import GoalForm from "./goal-form";

export default function Page() {
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">Στόχοι</h1>
        <p className="text-sm text-muted">
          Το σκορ δείχνει πώς πήγε η μέρα. Οι στόχοι δείχνουν προς τα πού πας τις επόμενες εβδομάδες, και δεν αλλάζουν το σκορ.
        </p>
      </div>
      <Suspense fallback={<p className="py-10 text-center text-muted">Φόρτωση…</p>}>
        <Goals />
      </Suspense>
    </main>
  );
}

const nf = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });

const BADGES: Record<Progress["status"], { text: string; className: string }> = {
  done: { text: "Το πέτυχες", className: "bg-good text-surface" },
  on: { text: "Σε καλό δρόμο", className: "bg-track text-good" },
  behind: { text: "Θέλει προσπάθεια", className: "bg-track text-bad" },
  collecting: { text: "Μαζεύω δεδομένα", className: "bg-track text-muted" },
};

async function Goals() {
  await connection();
  const today = dayOf(new Date());
  const [goals, config] = await Promise.all([getGoals(), getConfig()]);
  const metrics = scoringMetrics(config);
  const earliest = goals.reduce((d, g) => (g.startDay < d ? g.startDay : d), today);
  const [range, balance] = await Promise.all([
    getRange(addDays(earliest, -GOAL_LOOKBACK), today),
    goals.some((g) => g.metricId === null) ? balanceAt(today) : 0,
  ]);

  return (
    <>
      {goals.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">Δεν έχεις ορίσει στόχους ακόμα.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const metric = metrics.find((m) => m.id === goal.metricId);
            // The metric was archived or removed after the goal was made.
            if (goal.metricId !== null && !metric) return <Orphan key={goal.id} goal={goal} />;
            const progress = goalProgress(goal, metric, metric ? seriesOf(range, metric.id) : {}, balance, today);
            return <GoalCard key={goal.id} goal={goal} metric={metric} progress={progress} />;
          })}
        </ul>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Νέος στόχος</h2>
        <GoalForm metrics={metrics} tomorrow={addDays(today, 1)} />
      </section>
    </>
  );
}

function title(goal: Goal, metric: Metric | undefined): string {
  const name = metric?.name ?? "Υπόλοιπο χρημάτων";
  if (goal.kind === "change") return `${name}: ${goal.percent! < 0 ? "μείωση" : "αύξηση"} κατά ${nf.format(Math.abs(goal.percent!))}%`;
  if (goal.kind === "frequency") return `${name}: ${goal.perWeek} ${goal.perWeek === 1 ? "φορά" : "φορές"} την εβδομάδα`;
  return `${name}: ${amount(goal.targetValue!, metric)}`;
}

// Money for the balance, the metric's unit otherwise.
function amount(n: number, metric: Metric | undefined): string {
  return metric ? `${nf.format(n)}${metric.unit ? ` ${metric.unit}` : ""}` : formatMoney(n);
}

function detail(goal: Goal, metric: Metric | undefined, p: Progress): string {
  if (goal.kind === "frequency") {
    const streak = p.streak ? ` · ${p.streak} ${p.streak === 1 ? "εβδομάδα" : "εβδομάδες"} στη σειρά πριν από αυτή` : "";
    return `${p.current} από ${p.target} αυτή την εβδομάδα${streak}`;
  }
  if (goal.kind === "change") {
    if (p.start === null) return `Χρειάζομαι ${p.need} μέρες με καταχώρηση για να βρω την αφετηρία. Έχω ${p.have}.`;
    const range = `αφετηρία ${amount(p.start, metric)} · στόχος ${amount(p.target!, metric)}`;
    return p.current === null ? `Καμία καταχώρηση τις τελευταίες 7 μέρες · ${range}` : `Μέσος όρος 7 ημερών ${amount(p.current, metric)} · ${range}`;
  }
  if (p.current === null || p.start === null) return "Δεν υπάρχει ακόμα μέτρηση για να ξεκινήσει ο στόχος.";
  const left = Math.abs(p.target! - p.current);
  const due = goal.dueDay ? ` · έως ${formatDay(goal.dueDay)}` : "";
  return `Τώρα ${amount(p.current, metric)} · ξεκίνησες από ${amount(p.start, metric)} · ${p.status === "done" ? "έφτασες" : `απομένουν ${amount(left, metric)}`}${due}`;
}

function GoalCard({ goal, metric, progress: p }: { goal: Goal; metric: Metric | undefined; progress: Progress }) {
  const badge = BADGES[p.status];
  const name = title(goal, metric);
  return (
    <li className="rounded-2xl border border-border bg-surface py-3 pl-4 pr-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted">{detail(goal, metric, p)}</p>
        </div>
        <DeleteGoal id={goal.id} label={name} />
      </div>
      <div className="mt-3 flex items-center gap-3 pr-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-track">
          <div className={`h-full rounded-full ${p.status === "behind" ? "bg-bad" : "bg-good"}`} style={{ width: `${(p.fraction ?? 0) * 100}%` }} />
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>{badge.text}</span>
      </div>
    </li>
  );
}

function Orphan({ goal }: { goal: Goal }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface py-3 pl-4 pr-2">
      <p className="text-sm text-muted">Ο τομέας αυτού του στόχου έχει αρχειοθετηθεί.</p>
      <DeleteGoal id={goal.id} label="στόχος χωρίς τομέα" />
    </li>
  );
}
