"use client";

import { useState } from "react";

/**
 * A client component. The directive at the top of the file is what puts this
 * in the browser bundle; nothing else in this route is.
 *
 * Every prop here is serialisable, which is the rule for anything crossing
 * from a Server Component. A callback prop would fail at build time with
 * "Functions cannot be passed directly to Client Components", and the fix is
 * either to move the boundary or to pass a server action instead.
 */
export function AddToBasket({ name, maximum }: { name: string; maximum: number }) {
  const [quantity, setQuantity] = useState(0);

  if (maximum === 0) {
    return (
      <p data-testid="out-of-stock" className="note">
        Out of stock.
      </p>
    );
  }

  return (
    <div className="row" data-testid="add-to-basket">
      <button
        onClick={() => setQuantity((current) => Math.max(0, current - 1))}
        aria-label="One fewer"
      >
        −
      </button>
      <span data-testid="quantity" aria-live="polite">
        {quantity}
      </span>
      <button
        onClick={() => setQuantity((current) => Math.min(maximum, current + 1))}
        aria-label="One more"
        disabled={quantity >= maximum}
      >
        +
      </button>
      <span className="note">{quantity === 0 ? `Add ${name}` : `${quantity} of ${maximum}`}</span>
    </div>
  );
}
