import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

/**
 * The root layout. Two things worth knowing about it.
 *
 * It renders `<html>` and `<body>` itself, which no other React app does. Next
 * owns the document, so there is no index.html anywhere in this project.
 *
 * It is a Server Component, like every file in `app/` unless it says
 * otherwise, and it never re-renders on navigation. Moving between pages
 * replaces only what changed below it, so state in a layout survives, exactly
 * like a React Router layout route.
 */
export const metadata: Metadata = {
  title: "Next App Router",
  description: "Server Components, the client boundary, server actions and caching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          <nav className="top" aria-label="Sections">
            <Link href="/">Overview</Link>
            <Link href="/products">Server Components</Link>
            <Link href="/streaming">Streaming</Link>
            <Link href="/actions">Server actions</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
