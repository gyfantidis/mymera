"use client";

import { createContext, useContext, useEffect } from "react";
import { DEFAULT_LOCALE, i18n, type I18n, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export default function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // The <html> element is rendered before the locale is known, so its lang is set here.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useI18n(): I18n {
  return i18n(useContext(LocaleContext));
}
