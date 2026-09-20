"use client";

/**
 * A Client Component, and it has to be: it holds the pending state and the
 * result message. It is also as small as that requirement allows. The
 * product page around it stays on the server, so none of the catalogue
 * reaches the browser.
 *
 * useActionState gives the three things a form needs and a plain onSubmit
 * handler does not: the action runs on the server, the returned state
 * survives the round trip, and `pending` is true for exactly as long as it
 * is in flight. Without JavaScript this is still a form posting to an
 * endpoint, and it still works.
 */
import { useActionState } from "react";

import { addToCart, type ActionState } from "@/app/actions";

const EMPTY: ActionState = { ok: true, message: "" };

export function AddToCart({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [state, action, pending] = useActionState(addToCart, EMPTY);

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="slug" value={slug} />

      <label className="flex items-center gap-2 text-sm">
        Quantity
        <input
          name="quantity"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
          className="w-20 rounded-lg px-2 py-1.5"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        />
      </label>

      <button
        type="submit"
        disabled={disabled || pending}
        className="rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        data-testid="add-to-cart"
      >
        {pending ? "Adding…" : "Add to bag"}
      </button>

      {/* Always in the DOM, so the region exists before the message does.
          A live region added at the same moment as its text is often not
          announced at all. */}
      <p
        role="status"
        aria-live="polite"
        data-testid="add-result"
        className="w-full text-sm"
        style={{ color: state.ok ? "var(--ink-soft)" : "var(--ink)" }}
      >
        {state.message}
      </p>
    </form>
  );
}
