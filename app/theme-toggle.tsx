"use client";

import { useI18n } from "./locale-provider";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  function toggle() {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing: the choice lasts until the page is reloaded.
    }
  }

  return (
    <button type="button" onClick={toggle} aria-label={t("nav.theme")} title={t("nav.theme")} className={`rounded-lg p-1.5 text-muted hover:text-fg ${className}`}>
      <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 3a7 7 0 0 1 0 14Z" fill="currentColor" />
      </svg>
    </button>
  );
}
