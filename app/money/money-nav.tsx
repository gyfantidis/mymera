import Link from "next/link";

const TABS = [
  { key: "month", label: "Μήνας", href: "/money" },
  { key: "year", label: "Έτος", href: "/money/year" },
  { key: "categories", label: "Κατηγορίες", href: "/money/categories" },
] as const;

export default function MoneyNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Χρήματα" className="flex gap-1 rounded-xl bg-track p-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={`flex-1 rounded-lg py-1.5 text-center text-sm ${t.key === active ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-fg"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Card({ label, value, tone, children }: { label: string; value: string; tone?: "good" | "bad"; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd>
        <span className={`block text-xl font-semibold tabular-nums ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</span>
        {children && <span className="block text-xs text-muted">{children}</span>}
      </dd>
    </div>
  );
}

export const tone = (n: number) => (n > 0 ? "good" : n < 0 ? "bad" : undefined);
