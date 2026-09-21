"use client";

import { useActionState } from "react";

import { signIn, type ActionState } from "@/app/actions";

const EMPTY: ActionState = { ok: true, message: "" };

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, EMPTY);

  return (
    <form action={action} className="mt-4 space-y-3" data-testid="sign-in-form">
      {/* Where to go afterwards. The action validates it: an open redirect
          is what you get if you trust this field. */}
      <input type="hidden" name="next" value={next} />

      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-lg px-3 py-2"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        data-testid="sign-in"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p role="status" aria-live="polite" className="text-sm" data-testid="sign-in-error">
        {state.ok ? "" : state.message}
      </p>
    </form>
  );
}
