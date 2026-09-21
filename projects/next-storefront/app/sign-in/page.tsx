import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/SignInForm";

export const metadata: Metadata = { title: "Sign in" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function SignInPage({ searchParams }: Props) {
  return (
    <div className="max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }}>
        Any email works. There is no password and no user store, because this is here to show the
        routing, not to be an auth system.
      </p>

      {/*
        The fallback is a working form, not a spinner and not null.

        Reading `next` needs the request, so it has to sit behind a
        boundary. Without JavaScript the streamed half never swaps in,
        because the swap is a `$RC()` call in a script, so whatever is in
        the fallback is the whole page for that visitor. A `null` fallback
        meant /sign-in rendered nothing at all with JS off, and the test
        that catches it is in e2e/auth.spec.ts.

        So the prerendered form works and sends you to /orders. The
        streamed one knows where you were actually going. The difference
        is the destination, not whether you can sign in.
      */}
      <Suspense fallback={<SignInForm next="/orders" />}>
        <SignInFields searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SignInFields({ searchParams }: Props) {
  const next = (await searchParams)["next"];

  return <SignInForm next={typeof next === "string" ? next : "/orders"} />;
}
