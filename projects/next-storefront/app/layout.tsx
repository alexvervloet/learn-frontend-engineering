import type { Metadata } from "next";

import { BagLink } from "@/components/BagLink";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Storefront", template: "%s · Storefront" },
  description: "A small shop on the App Router.",
};

/**
 * The layout itself reads nothing from the request, and that is the point.
 *
 * The bag count needs the cart cookie, so it lives in its own component
 * behind a Suspense boundary inside BagLink. Reading the cookie here
 * instead makes every route in the app dynamic, which the build output
 * shows plainly: seven `ƒ` where there should be `◐`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main">
          Skip to the content
        </a>

        <header style={{ borderBottom: "1px solid var(--line)" }}>
          <nav
            aria-label="Main"
            className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3"
          >
            <a href="/" className="font-semibold">
              Storefront
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/products">Products</a>
              <a href="/search">Search</a>
              <BagLink />
            </div>
          </nav>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto max-w-4xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
