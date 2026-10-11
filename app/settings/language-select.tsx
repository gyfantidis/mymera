"use client";

import { useTransition } from "react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { setLocale } from "../actions";
import { useI18n } from "../locale-provider";

export default function LanguageSelect() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm">
      {t("settings.language")}
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => startTransition(() => setLocale(e.target.value as Locale))}
        className="h-9 rounded-lg border border-border bg-transparent px-2 text-sm outline-none focus:border-fg"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
