import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";
import LocaleProvider from "./locale-provider";

export const metadata: Metadata = {
  title: "MyMera",
  description: "How productive was my day",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // lang is corrected on the client once the visitor's language is known.
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto w-full max-w-xl px-4 pb-16">
          {/* The language comes from a cookie, so everything that shows text waits for it. */}
          <Suspense fallback={null}>
            <Shell>{children}</Shell>
          </Suspense>
        </div>
      </body>
    </html>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <LocaleProvider locale={locale}>
      <nav className="flex items-center justify-between py-4 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          MyMera
        </Link>
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-muted">
          <Link href="/stats" className="hover:text-fg">
            {t("nav.stats")}
          </Link>
          <Link href="/goals" className="hover:text-fg">
            {t("nav.goals")}
          </Link>
          <Link href="/money" className="hover:text-fg">
            {t("nav.money")}
          </Link>
          <Link href="/settings" className="hover:text-fg">
            {t("nav.settings")}
          </Link>
        </div>
      </nav>
      {children}
    </LocaleProvider>
  );
}
