import Link from "next/link";
import type { I18n } from "@/lib/i18n";

const TABS = [
  { key: "month", href: "/money" },
  { key: "year", href: "/money/year" },
  { key: "categories", href: "/money/categories" },
] as const;

export default function MoneyNav({ active, f }: { active: (typeof TABS)[number]["key"]; f: I18n }) {
  return (
    <nav aria-label={f.t("nav.money")} className="flex gap-1 rounded-xl bg-track p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={`flex-1 rounded-lg py-1.5 text-center text-sm ${tab.key === active ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-fg"}`}
        >
          {f.t(`money.tab.${tab.key}`)}
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
