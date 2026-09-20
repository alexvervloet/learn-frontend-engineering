/**
 * The catalogue, and the only place that reads it.
 *
 * This module never runs in the browser. It has no "use client" anywhere
 * above it, so importing it from a Client Component is a build error rather
 * than a silent 40KB of product data in the bundle. In a real app the same
 * boundary is what stops a database URL reaching a browser, and
 * `import "server-only"` at the top makes the error message say so.
 */
import "server-only";
import { cacheLife } from "next/cache";

import type { Pence } from "./money";

export type Product = {
  slug: string;
  name: string;
  blurb: string;
  price: Pence;
  category: "desk" | "audio" | "light";
  stock: number;
  rating: number;
};

const CATALOGUE: Product[] = [
  {
    slug: "walnut-desk-mat",
    name: "Walnut desk mat",
    blurb: "Oiled walnut, 900 by 400, felt backing so it does not slide.",
    price: 6400,
    category: "desk",
    stock: 12,
    rating: 4.6,
  },
  {
    slug: "brass-monitor-riser",
    name: "Brass monitor riser",
    blurb: "Solid, heavy, and exactly tall enough to stop the neck ache.",
    price: 12900,
    category: "desk",
    stock: 4,
    rating: 4.8,
  },
  {
    slug: "linen-cable-sleeve",
    name: "Linen cable sleeve",
    blurb: "Hides the four cables you cannot get rid of.",
    price: 1450,
    category: "desk",
    stock: 40,
    rating: 4.1,
  },
  {
    slug: "field-headphones",
    name: "Field headphones",
    blurb: "Closed back, replaceable pads, a cable you can actually buy again.",
    price: 18900,
    category: "audio",
    stock: 7,
    rating: 4.7,
  },
  {
    slug: "desk-microphone",
    name: "Desk microphone",
    blurb: "Cardioid, USB-C, and a mute button you can find without looking.",
    price: 9900,
    category: "audio",
    stock: 0,
    rating: 4.4,
  },
  {
    slug: "paper-speaker",
    name: "Paper cone speaker",
    blurb: "One driver, one knob, no app.",
    price: 7600,
    category: "audio",
    stock: 15,
    rating: 4.2,
  },
  {
    slug: "clamp-task-lamp",
    name: "Clamp task lamp",
    blurb: "2700K to 5000K, clamps to anything up to 60mm.",
    price: 8200,
    category: "light",
    stock: 9,
    rating: 4.5,
  },
  {
    slug: "paper-lantern",
    name: "Paper lantern",
    blurb: "Warm, cheap, and the only thing that makes a rented flat bearable.",
    price: 2600,
    category: "light",
    stock: 23,
    rating: 3.9,
  },
];

export const CATEGORIES = ["desk", "audio", "light"] as const;

/**
 * Stands in for a slow database. Every read goes through it so the streaming
 * boundaries in the search page have something real to wait for.
 */
async function slow<T>(value: T, ms: number): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
}

/**
 * `"use cache"` is the unit of caching now, and it is per function rather
 * than per route. The arguments are the cache key, so `getProduct("x")` and
 * `getProduct("y")` are separate entries.
 *
 * `cacheLife("minutes")` is a named profile: served from cache for a
 * minute, revalidated in the background after that. A price change shows up
 * within the minute, or immediately if a server action calls
 * `revalidatePath`.
 */
export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");

  return slow(CATALOGUE, 50);
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");

  return slow(CATALOGUE.find((product) => product.slug === slug) ?? null, 40);
}

export async function getSlugs(): Promise<string[]> {
  return CATALOGUE.map((product) => product.slug);
}

/**
 * The filter itself is pure and exported separately, so the rules can be
 * tested without a server, a request or a timer.
 */
export type Filters = { q?: string; category?: string; sort?: string };

export function applyFilters(products: Product[], filters: Filters): Product[] {
  const needle = filters.q?.trim().toLowerCase() ?? "";

  const matched = products.filter((product) => {
    // `category: ""` means no filter, not "match the empty category".
    if (filters.category !== undefined && filters.category !== "") {
      if (product.category !== filters.category) return false;
    }
    if (needle === "") return true;
    return (
      product.name.toLowerCase().includes(needle) || product.blurb.toLowerCase().includes(needle)
    );
  });

  // A copy, because sorting in place would mutate the module-level
  // catalogue, and on a warm server that array outlives the request.
  return [...matched].sort((left, right) => {
    if (filters.sort === "price-asc") return left.price - right.price;
    if (filters.sort === "price-desc") return right.price - left.price;
    if (filters.sort === "rating") return right.rating - left.rating;
    return left.name.localeCompare(right.name);
  });
}

export async function searchProducts(filters: Filters): Promise<Product[]> {
  // 700ms, so the Suspense boundary around this is visible rather than
  // theoretical. The header and the filters paint immediately.
  return applyFilters(await slow(CATALOGUE, 700), filters);
}
