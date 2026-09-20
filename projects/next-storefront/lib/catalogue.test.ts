import { describe, expect, it } from "vitest";

import { applyFilters, type Product } from "./catalogue";

const PRODUCTS: Product[] = [
  {
    slug: "a",
    name: "Brass riser",
    blurb: "heavy",
    price: 12900,
    category: "desk",
    stock: 4,
    rating: 4.8,
  },
  {
    slug: "b",
    name: "Paper lantern",
    blurb: "warm and cheap",
    price: 2600,
    category: "light",
    stock: 23,
    rating: 3.9,
  },
  {
    slug: "c",
    name: "Clamp lamp",
    blurb: "2700K to 5000K",
    price: 8200,
    category: "light",
    stock: 9,
    rating: 4.5,
  },
  {
    slug: "d",
    name: "Field headphones",
    blurb: "closed back",
    price: 18900,
    category: "audio",
    stock: 7,
    rating: 4.7,
  },
];

describe("filtering", () => {
  it("searches the blurb as well as the name", () => {
    expect(applyFilters(PRODUCTS, { q: "closed" }).map((p) => p.slug)).toEqual(["d"]);
  });

  it("ignores case and surrounding space", () => {
    expect(applyFilters(PRODUCTS, { q: "  LANTERN " }).map((p) => p.slug)).toEqual(["b"]);
  });

  it("combines the query with the category rather than replacing it", () => {
    expect(applyFilters(PRODUCTS, { q: "lamp", category: "light" }).map((p) => p.slug)).toEqual([
      "c",
    ]);
    expect(applyFilters(PRODUCTS, { q: "lamp", category: "audio" })).toEqual([]);
  });

  it("returns everything for no filters", () => {
    expect(applyFilters(PRODUCTS, {})).toHaveLength(4);
  });

  it("treats an empty category as no filter", () => {
    // A GET form submits every field, so choosing "Any" sends
    // `category=`. Reading that as a value matched nothing.
    expect(applyFilters(PRODUCTS, { category: "" })).toHaveLength(4);
    expect(applyFilters(PRODUCTS, { q: "lamp", category: "" }).map((p) => p.slug)).toEqual(["c"]);
  });

  it("ignores a category nobody sells", () => {
    // ?category=nonsense comes from the URL, so it arrives eventually.
    expect(applyFilters(PRODUCTS, { category: "nonsense" })).toEqual([]);
  });
});

describe("sorting", () => {
  it("sorts by name by default, not by insertion order", () => {
    expect(applyFilters(PRODUCTS, {}).map((p) => p.name)).toEqual([
      "Brass riser",
      "Clamp lamp",
      "Field headphones",
      "Paper lantern",
    ]);
  });

  it("sorts price as a number in both directions", () => {
    expect(applyFilters(PRODUCTS, { sort: "price-asc" }).map((p) => p.price)).toEqual([
      2600, 8200, 12900, 18900,
    ]);
    expect(applyFilters(PRODUCTS, { sort: "price-desc" })[0]?.price).toBe(18900);
  });

  it("puts the best rated first", () => {
    expect(applyFilters(PRODUCTS, { sort: "rating" })[0]?.slug).toBe("a");
  });

  it("falls back to name for a sort key that does not exist", () => {
    expect(applyFilters(PRODUCTS, { sort: "haunted" })[0]?.name).toBe("Brass riser");
  });

  it("does not mutate the catalogue it sorts", () => {
    // The module-level array outlives a request on a warm server, so an
    // in-place sort would leak one visitor's ordering to the next.
    const order = PRODUCTS.map((p) => p.slug);
    applyFilters(PRODUCTS, { sort: "price-desc" });

    expect(PRODUCTS.map((p) => p.slug)).toEqual(order);
  });
});
