"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./locale-provider";

// 20px line icons, drawn with the current text colour.
const ICONS = {
  today: <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  stats: <path d="M3.5 16.5v-5M8 16.5v-9M12.5 16.5v-6M17 16.5V4" />,
  goals: <path d="M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-3.5h.01" />,
  money: <path d="M14.5 6.2A5 5 0 1 0 14.5 13.8M4 8.7h7M4 11.3h7" />,
  settings: <path d="M4 6h5M13 6h3M4 14h3M11 14h5M11 4v4M9 12v4" />,
};

const ITEMS = [
  { href: "/", icon: "today", label: "day.today" },
  { href: "/stats", icon: "stats", label: "nav.stats" },
  { href: "/goals", icon: "goals", label: "nav.goals" },
  { href: "/money", icon: "money", label: "nav.money" },
  { href: "/settings", icon: "settings", label: "nav.settings" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();
  const { t } = useI18n();
  return (
    <div className="flex gap-1">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 border-b-[3px] px-1 pb-1.5 pt-1 text-[11px] transition-colors sm:flex-none sm:flex-row sm:gap-1.5 sm:px-2.5 sm:pb-2.5 sm:pt-2 sm:text-sm ${
              active ? "border-sun font-bold text-accent" : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[item.icon]}
            </svg>
            {t(item.label)}
          </Link>
        );
      })}
    </div>
  );
}
