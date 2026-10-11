// Translations and locale-aware formatting; safe to import from client components.
import { el } from "./el";
import { en } from "./en";

export type Locale = "el" | "en";
export type Key = keyof typeof el;
type Vars = Record<string, string | number>;

export const LOCALES: Locale[] = ["el", "en"];
export const LOCALE_NAMES: Record<Locale, string> = { el: "Ελληνικά", en: "English" };
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const isLocale = (s: unknown): s is Locale => LOCALES.includes(s as Locale);

const DICTIONARIES: Record<Locale, Record<Key, string>> = { el, en };
// en-GB keeps day-before-month dates and the euro sign in front, which suits a European app.
const INTL: Record<Locale, string> = { el: "el-GR", en: "en-GB" };

function build(locale: Locale) {
  const dict = DICTIONARIES[locale];
  const tag = INTL[locale];
  const number = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 });
  const euro = new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" });
  const date = (day: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(day + "T12:00:00Z").toLocaleDateString(tag, { ...opts, timeZone: "UTC" });
  const t = (key: Key, vars?: Vars) => dict[key].replace(/\{(\w+)\}/g, (whole, name) => String(vars?.[name] ?? whole));

  return {
    locale,
    t,
    // Picks the "one" key when n is 1 and the "other" key otherwise; {n} is filled in.
    plural: (n: number, one: Key, other: Key, vars?: Vars) => t(n === 1 ? one : other, { n, ...vars }),
    num: (n: number) => number.format(n),
    money: (n: number) => euro.format(n),
    // Money with an explicit sign, for results and balances.
    signed: (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + euro.format(Math.abs(n)),
    day: (day: string) => date(day, { weekday: "long", day: "numeric", month: "long" }),
    shortDay: (day: string) => date(day, { day: "numeric", month: "short" }),
    shortDayYear: (day: string) => date(day, { day: "numeric", month: "short", year: "numeric" }),
    weekday: (day: string) => date(day, { weekday: "short" }),
    month: (day: string) => date(day, { month: "short" }),
    monthYear: (day: string) => date(day, { month: "long", year: "numeric" }),
  };
}

export type I18n = ReturnType<typeof build>;

const cache = new Map<Locale, I18n>();

export function i18n(locale: Locale): I18n {
  let instance = cache.get(locale);
  if (!instance) cache.set(locale, (instance = build(locale)));
  return instance;
}
