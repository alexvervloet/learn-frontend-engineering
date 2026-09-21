import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/SignOutButton";
import { SESSION_COOKIE, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Your orders" };

/**
 * A blocking route, deliberately, and the only one in the app.
 *
 * Every other page here has a static shell worth sending first. This one
 * does not: the heading is the only thing that does not depend on who you
 * are, and a page that says "Your orders" to a signed-out visitor before
 * redirecting them is worse than a page that waits.
 *
 * The alternative was a Suspense boundary around the whole body, and I
 * tried that first. Without JavaScript the streamed half never swaps in,
 * because the swap is a `$RC()` call in a script, so the page showed
 * "Checking…" and stopped. `instant = false` tells Next this route is
 * allowed to block, which is the honest answer when there is no shell.
 */
export const instant = false;

/**
 * The real check, and it is deliberately not the same one the proxy did.
 *
 * The proxy only saw that a cookie called `session` existed. This verifies
 * the signature, so an edited cookie gets you as far as the redirect and
 * no further. A page that assumed the proxy had already checked would hand
 * this content to anyone who typed `document.cookie = "session=x"`.
 */
export default async function OrdersPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const email = readSession(token);
  if (email === null) redirect("/sign-in?next=/orders");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Your orders</h1>
      <p className="mt-2" style={{ color: "var(--ink-soft)" }} data-testid="signed-in-as">
        Signed in as {email}
      </p>
      <p className="mt-4">No orders yet. Nothing here is real.</p>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
