"use client";

/**
 * Optimistic quantity, the built-in way.
 *
 * useOptimistic shows the new number immediately and, crucially, rolls it
 * back on its own when the action finishes or fails. A useState mirror of
 * server data does not: you end up writing the rollback by hand and getting
 * it wrong in the error case.
 *
 * These are two real forms with two real submit buttons, so this works with
 * JavaScript switched off. The optimism is the enhancement, not the
 * mechanism.
 */
import { useOptimistic } from "react";

import { removeFromCart, updateQuantity } from "@/app/actions";
import { MAX_PER_LINE } from "@/lib/cart";

export function QuantityForm({
  slug,
  quantity,
  name,
}: {
  slug: string;
  quantity: number;
  name: string;
}) {
  const [shown, setShown] = useOptimistic(quantity);

  async function change(next: number) {
    setShown(next);

    const data = new FormData();
    data.set("slug", slug);
    data.set("quantity", String(next));
    await updateQuantity(data);
  }

  return (
    <div className="flex items-center gap-1">
      <form
        action={async () => {
          await change(shown - 1);
        }}
      >
        <button
          type="submit"
          className="rounded-lg px-2 py-1"
          style={{ border: "1px solid var(--line)" }}
          aria-label={`One fewer ${name}`}
        >
          −
        </button>
      </form>

      <span className="w-8 text-center tabular-nums" data-testid={`quantity-${slug}`}>
        {shown}
      </span>

      <form
        action={async () => {
          await change(shown + 1);
        }}
      >
        <button
          type="submit"
          className="rounded-lg px-2 py-1 disabled:opacity-40"
          style={{ border: "1px solid var(--line)" }}
          aria-label={`One more ${name}`}
          disabled={shown >= MAX_PER_LINE}
        >
          +
        </button>
      </form>

      <form action={removeFromCart} className="ml-2">
        <input type="hidden" name="slug" value={slug} />
        <button type="submit" className="text-sm underline" data-testid={`remove-${slug}`}>
          Remove
        </button>
      </form>
    </div>
  );
}
