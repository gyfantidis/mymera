import { DEFAULT_LOCALE, isLocale, type Locale } from ".";

// Language used when a visitor has not picked one, and for the template a new database starts with.
export function serverDefaultLocale(): Locale {
  const value = process.env.MYMERA_DEFAULT_LOCALE;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
