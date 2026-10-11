import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";
import LocaleProvider from "./locale-provider";
import NavLinks from "./nav-links";

const inter = Inter({ subsets: ["latin", "greek"], variable: "--font-inter" });

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
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* The language comes from a cookie, so everything that shows text waits for it. */}
        <Suspense fallback={null}>
          <Shell>{children}</Shell>
        </Suspense>
      </body>
    </html>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider locale={await getLocale()}>
      <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <span aria-hidden="true" className="h-5 w-5 rounded-full bg-gradient-to-br from-warn to-accent" />
            MyMera
          </Link>
          <NavLinks />
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">{children}</div>
    </LocaleProvider>
  );
}
