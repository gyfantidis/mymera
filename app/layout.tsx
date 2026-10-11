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
            <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-muted">
              <Link href="/stats" className="hover:text-fg">
                Στατιστικά
              </Link>
              <Link href="/goals" className="hover:text-fg">
                Στόχοι
              </Link>
              <Link href="/money" className="hover:text-fg">
                Χρήματα
              </Link>
              <Link href="/settings" className="hover:text-fg">
                Ρυθμίσεις
              </Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
