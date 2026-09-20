import { itemCount } from "@/lib/cart";
import { readCart } from "@/lib/cart-cookie";

/**
 * The one component that reads the request, kept as small as it can be.
 *
 * It sits behind a Suspense boundary in the layout, so everything else on
 * the page prerenders and this arrives a moment later. Reading the cookie
 * in the layout itself makes every route in the app dynamic, which is a
 * whole-app cost for one number.
 */
export async function BagCount() {
  const cart = await readCart();
  const count = itemCount(cart);

  return (
    <>
      <span
        data-testid="bag-count"
        className="rounded-full px-2 py-0.5 text-xs"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        {count}
      </span>
      {/* A number in a coloured pill reads as "Bag 3", which could be
          anything. */}
      <span className="sr-only">{count === 1 ? "item in your bag" : "items in your bag"}</span>
    </>
  );
}
