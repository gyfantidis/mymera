import Link from "next/link";
import { addDays, formatDay } from "@/lib/dates";
import { daysIn, monthShort, weekStart } from "@/lib/periods";

type Props = {
  points: { day: string; score: number | null }[];
  from: string;
  to: string;
  today: string;
  // Day to outline, e.g. the one currently open.
  selected?: string;
  // Month names above the columns, for ranges that span several months.
  months?: boolean;
};

// GitHub-style calendar: one column per week (Monday on top), darker cells for higher scores.
export default function Heatmap({ points, from, to, today, selected, months = false }: Props) {
  const byDay = new Map(points.map((p) => [p.day, p.score]));
  const cells = daysIn(weekStart(from), addDays(weekStart(to), 6));
  const columns = cells.length / 7;
  const grid = { gridAutoColumns: "1fr", maxWidth: `${columns * 30}px` };
  return (
    // Padding leaves room for the selected day's outline inside the scroll container.
    <div className="overflow-x-auto p-[3px]">
      <div style={{ minWidth: `${columns * 9}px` }}>
        {months && (
          <div className="mb-1 grid grid-flow-col text-[10px] text-muted" style={grid}>
            {Array.from({ length: columns }, (_, c) => {
              // Label a column when a month starts in it.
              const first = cells.slice(c * 7, c * 7 + 7).find((d) => d.endsWith("-01") && d >= from && d <= to);
              return (
                <span key={c} className="overflow-visible whitespace-nowrap">
                  {first ? monthShort(first) : ""}
                </span>
              );
            })}
          </div>
        )}
        <div className="grid grid-flow-col gap-[3px]" style={{ ...grid, gridTemplateRows: "repeat(7, 1fr)" }}>
          {cells.map((day) => {
            if (day < from || day > to) return <span key={day} className="aspect-square" />;
            if (day > today) return <span key={day} className="aspect-square rounded-[2px] border border-border" />;
            const score = byDay.get(day) ?? null;
            return (
              <Link
                key={day}
                href={`/?d=${day}`}
                title={`${formatDay(day)}: ${score ?? "χωρίς δεδομένα"}`}
                className={`aspect-square rounded-[2px] bg-track ${day === selected ? "outline outline-2 outline-fg" : ""}`}
                style={score === null ? undefined : { background: `color-mix(in srgb, var(--good) ${15 + score * 0.85}%, var(--track))` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
