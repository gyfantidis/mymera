import Bar from "../bar";
import Blocks from "../blocks";
import type { GoalKind, Progress } from "@/lib/goals-shared";

// Frequency goals get one square per time needed this week; the rest are a bar.
export default function GoalBlocks({ kind, progress: p, size = "md" }: { kind: GoalKind; progress: Progress; size?: "sm" | "md" }) {
  if (kind === "frequency" && p.target) return <Blocks value={p.current ?? 0} total={Math.min(p.target, 14)} size={size} />;
  return <Bar fraction={p.fraction ?? 0} tone={p.status === "behind" ? "bad" : "accent"} size={size} />;
}
