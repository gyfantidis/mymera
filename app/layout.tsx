import type { Metadata, Viewport } from "next";
import { Commissioner } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";
import LocaleProvider from "./locale-provider";
import Logo from "./logo";
import NavLinks from "./nav-links";
import ThemeToggle from "./theme-toggle";

// Commissioner is drawn by a Greek designer, so Greek and Latin sit together naturally.
const font = Commissioner({ subsets: ["latin", "greek"], variable: "--font-app" });

// Runs before the first paint so a saved choice never flashes the other theme.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

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
    // lang and the chosen theme are corrected on the client, hence suppressHydrationWarning.
    <html lang="en" className={`${font.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
      <header className="sticky top-0 z-10 border-b-2 border-accent bg-bg">
        <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight sm:pb-2">
            <Logo />
            MyMera
          </Link>
          <NavLinks />
          {/* Top right corner on phones, after the tabs on wider screens. */}
          <ThemeToggle className="absolute right-3 top-1.5 sm:static sm:mb-2" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">{children}</div>
    </LocaleProvider>
  );
}
