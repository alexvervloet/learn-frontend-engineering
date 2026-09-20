import { describe, expect, it } from "vitest";

import {
  MAX_PER_LINE,
  addItem,
  amountToFreeDelivery,
  cartLines,
  cartTotals,
  itemCount,
  parseCart,
  removeItem,
  serialiseCart,
  setQuantity,
  type Cart,
} from "./cart";
import type { Product } from "./catalogue";

const MAT: Product = {
  slug: "walnut-desk-mat",
  name: "Walnut desk mat",
  blurb: "",
  price: 6400,
  category: "desk",
  stock: 12,
  rating: 4.6,
};

const LAMP: Product = {
  ...MAT,
  slug: "paper-lantern",
  name: "Paper lantern",
  price: 2600,
  stock: 3,
};

describe("reading the cookie", () => {
  it("treats it as user input, not as data you wrote", () => {
    // Every one of these is something a person can put in their own cookie
    // jar and send back. A cart with -3 items has a negative total.
    expect(parseCart('{"a":-3}')).toEqual({});
    expect(parseCart('{"a":0}')).toEqual({});
    expect(parseCart('{"a":1.5}')).toEqual({});
    expect(parseCart('{"a":"7"}')).toEqual({});
    expect(parseCart("[1,2,3]")).toEqual({});
    expect(parseCart("not json at all")).toEqual({});
    expect(parseCart(undefined)).toEqual({});
  });

  it("keeps the valid entries out of a mixed object rather than dropping everything", () => {
    expect(parseCart('{"good":2,"bad":-1}')).toEqual({ good: 2 });
  });

  it("round-trips", () => {
    const cart: Cart = { "walnut-desk-mat": 2, "paper-lantern": 1 };

    expect(parseCart(serialiseCart(cart))).toEqual(cart);
  });
});

describe("changing quantities", () => {
  it("never goes above stock, however much the form asked for", () => {
    // The stock number comes from the catalogue. A hidden input saying
    // quantity=999 is trivial to send.
    expect(setQuantity({}, "paper-lantern", 999, 3)).toEqual({ "paper-lantern": 3 });
  });

  it("never goes above the per-line cap even when stock is plentiful", () => {
    expect(setQuantity({}, "walnut-desk-mat", 50, 100)["walnut-desk-mat"]).toBe(MAX_PER_LINE);
  });

  it("removes the line at zero or below instead of storing a 0", () => {
    const cart = { "paper-lantern": 2 };

    expect(setQuantity(cart, "paper-lantern", 0, 3)).toEqual({});
    expect(setQuantity(cart, "paper-lantern", -5, 3)).toEqual({});
  });

  it("adds to what is already there", () => {
    expect(addItem({ "paper-lantern": 1 }, "paper-lantern", 3, 2)).toEqual({ "paper-lantern": 3 });
  });

  it("does not mutate the cart it was given", () => {
    const cart = { "paper-lantern": 1 };
    addItem(cart, "paper-lantern", 3);
    removeItem(cart, "paper-lantern");

    expect(cart).toEqual({ "paper-lantern": 1 });
  });

  it("counts items, not lines", () => {
    expect(itemCount({ a: 2, b: 3 })).toBe(5);
    expect(itemCount({})).toBe(0);
  });
});

describe("turning a cart into lines", () => {
  it("drops a slug that has left the catalogue rather than rendering a blank row", () => {
    // Carts outlive catalogues. This one has been in a cookie for a month.
    const lines = cartLines({ "walnut-desk-mat": 1, "discontinued-thing": 2 }, [MAT, LAMP]);

    expect(lines.map((line) => line.product.slug)).toEqual(["walnut-desk-mat"]);
  });

  it("multiplies in pence", () => {
    const [line] = cartLines({ "walnut-desk-mat": 3 }, [MAT]);

    expect(line?.lineTotal).toBe(19_200);
  });
});

describe("totals", () => {
  it("charges delivery under the threshold and not over it", () => {
    const under = cartTotals(cartLines({ "paper-lantern": 1 }, [LAMP]));
    expect(under).toEqual({ subtotal: 2600, delivery: 395, total: 2995 });

    const over = cartTotals(cartLines({ "walnut-desk-mat": 1 }, [MAT]));
    expect(over).toEqual({ subtotal: 6400, delivery: 0, total: 6400 });
  });

  it("charges nothing on an empty bag, rather than £3.95 for delivering nothing", () => {
    expect(cartTotals([])).toEqual({ subtotal: 0, delivery: 0, total: 0 });
  });

  it("is exact, because floats are not", () => {
    // Three at £19.99 in floats is 59.97000000000001.
    const item: Product = { ...MAT, price: 1999 };
    const { subtotal } = cartTotals(cartLines({ [item.slug]: 3 }, [item]));

    expect(subtotal).toBe(5997);
  });

  it("says how much more buys free delivery, and stops saying it once it does", () => {
    expect(amountToFreeDelivery(2600)).toBe(2400);
    expect(amountToFreeDelivery(5000)).toBeNull();
    // Not "spend £50 more" at an empty bag.
    expect(amountToFreeDelivery(0)).toBeNull();
  });
});
