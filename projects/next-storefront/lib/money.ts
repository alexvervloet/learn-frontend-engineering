/**
 * Money is an integer number of pence, everywhere, and it is only formatted
 * at the edge.
 *
 * 0.1 + 0.2 is 0.30000000000000004, and a basket of three £19.99 items in
 * floats is £59.97000000000001. The bug does not show up until someone
 * checks a total against a card statement.
 */
export type Pence = number;

export function formatMoney(pence: Pence): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** Free over £50, which is a rule the cart page and the checkout must agree on. */
export const FREE_DELIVERY_THRESHOLD: Pence = 5000;
export const DELIVERY: Pence = 395;

export function deliveryFor(subtotal: Pence): Pence {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY;
}
