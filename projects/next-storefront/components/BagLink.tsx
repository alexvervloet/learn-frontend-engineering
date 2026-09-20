import { Suspense } from "react";

import { BagCount } from "./BagCount";

/**
 * The link is static, the number is not. The fallback is a pill of the same
 * size, so the header does not jump when the count arrives.
 */
export function BagLink() {
  return (
    <a href="/cart" className="flex items-center gap-1.5" data-testid="bag-link">
      Bag
      <Suspense
        fallback={
          <span
            data-testid="bag-count-pending"
            className="rounded-full px-2 py-0.5 text-xs"
            style={{ background: "var(--line)", color: "transparent" }}
            aria-hidden="true"
          >
            0
          </span>
        }
      >
        <BagCount />
      </Suspense>
    </a>
  );
}
