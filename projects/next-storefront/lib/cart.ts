/**
 * The cart as data, with no cookies, no request and no React in sight.
 *
 * Everything here is a pure function on a plain object, which is what makes
 * the interesting rules testable: quantity clamping, stock limits, the
 * delivery threshold. The cookie is a separate, small module, and the server
 * actions are thinner still.
 */
import { FREE_DELIVERY_THRESHOLD, deliveryFor, type Pence } from "./money";
import type { Product } from "./catalogue";

/** slug -> quantity. Nothing else: the price comes from the catalogue. */
export type Cart = Record<string, number>;

export const MAX_PER_LINE = 10;

export function parseCart(raw: string | undefined): Cart {
  if (raw === undefined || raw === "") return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

    // A cookie is user input. Anything that is not a positive integer
    // quantity is dropped rather than trusted, because the alternative is a
    // cart with -3 items in it and a negative total.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
}

export function serialiseCart(cart: Cart): string {
  return JSON.stringify(cart);
}

export function setQuantity(cart: Cart, slug: string, quantity: number, stock: number): Cart {
  const next = { ...cart };
  // Never above stock and never above the per-line cap, whichever is lower.
  const clamped = Math.min(Math.trunc(quantity), stock, MAX_PER_LINE);

  if (clamped <= 0) delete next[slug];
  else next[slug] = clamped;

  return next;
}

export function addItem(cart: Cart, slug: string, stock: number, by = 1): Cart {
  return setQuantity(cart, slug, (cart[slug] ?? 0) + by, stock);
}

export function removeItem(cart: Cart, slug: string): Cart {
  const next = { ...cart };
  delete next[slug];
  return next;
}

export function itemCount(cart: Cart): number {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

export type CartLine = { product: Product; quantity: number; lineTotal: Pence };

/**
 * A slug in the cookie that is no longer in the catalogue is dropped, not
 * rendered as a blank row. Carts outlive catalogues.
 */
export function cartLines(cart: Cart, catalogue: Product[]): CartLine[] {
  return Object.entries(cart).flatMap(([slug, quantity]) => {
    const product = catalogue.find((candidate) => candidate.slug === slug);
    if (product === undefined) return [];

    return [{ product, quantity, lineTotal: product.price * quantity }];
  });
}

export type CartTotals = { subtotal: Pence; delivery: Pence; total: Pence };

export function cartTotals(lines: CartLine[]): CartTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const delivery = deliveryFor(subtotal);

  return { subtotal, delivery, total: subtotal + delivery };
}

/** How much more to spend for free delivery, or null once it is free. */
export function amountToFreeDelivery(subtotal: Pence): Pence | null {
  const remaining = FREE_DELIVERY_THRESHOLD - subtotal;
  return subtotal > 0 && remaining > 0 ? remaining : null;
}
