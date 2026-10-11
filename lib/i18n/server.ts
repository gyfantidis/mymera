import { cookies } from "next/headers";
import { LOCALE_COOKIE, i18n, isLocale, type I18n, type Locale } from ".";
import { serverDefaultLocale } from "./default";

// Reads the request's cookie, so call it inside a <Suspense> boundary.
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : serverDefaultLocale();
}

export async function getI18n(): Promise<I18n> {
  return i18n(await getLocale());
}
