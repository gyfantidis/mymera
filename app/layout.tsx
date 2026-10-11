import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyMera",
  description: "Πόσο παραγωγική ήταν η μέρα μου",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="el" className="h-full antialiased">
      <body className="min-h-full">
        <div className="mx-auto w-full max-w-xl px-4 pb-16">
          <nav className="flex items-center justify-between py-4 text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              MyMera
            </Link>
            <Link href="/settings" className="text-muted hover:text-fg">
              Ρυθμίσεις
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
