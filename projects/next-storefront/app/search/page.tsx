import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductCard } from "@/components/ProductCard";
import { SearchForm } from "@/components/SearchForm";
import { searchProducts, type Filters } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Search" };

/**
 * The URL is the state. No useState, no client cache, no effect syncing one
 * to the other.
 *
 * What that buys: a search is a link you can send someone, the back button
 * does what it says, and a reload lands on the same results. The cost is a
 * round trip per change, which is why the slow half is streamed rather than
 * blocking the page.
 */
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined): string | undefined {
  // ?category=desk&category=audio arrives as an array. Taking the first is
  // a decision; crashing on it is what happens if you assume a string.
  return Array.isArray(value) ? value[0] : value;
}

export default function SearchPage({ searchParams }: Props) {
  // The heading prerenders. Reading searchParams is what makes the rest
  // request-specific, so it happens inside the boundary, not here.
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>
      <Suspense fallback={<p style={{ color: "var(--ink-soft)" }}>Loading the filters…</p>}>
        <SearchSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Two boundaries, nested, because the two waits are different lengths.
 * Awaiting searchParams resolves in about no time, so the form appears at
 * once and you can type in it. The catalogue read takes 700ms, so the
 * results stream in behind their own fallback.
 *
 * One boundary around both would hold the form back for the slower of the
 * two, which is the usual way streaming gets built and then does nothing.
 */
async function SearchSection({ searchParams }: Props) {
  const params = await searchParams;
  const filters: Filters = {
    q: one(params["q"]),
    category: one(params["category"]),
    sort: one(params["sort"]),
  };

  return (
    <>
      <SearchForm filters={filters} />

      <Suspense
        // The key matters. Without it React reuses the boundary across
        // navigations and the old results stay on screen with no fallback,
        // so a slow search looks like a broken one.
        key={JSON.stringify(filters)}
        fallback={
          <p data-testid="results-pending" style={{ color: "var(--ink-soft)" }}>
            Searching…
          </p>
        }
      >
        <Results filters={filters} />
      </Suspense>
    </>
  );
}

async function Results({ filters }: { filters: Filters }) {
  const products = await searchProducts(filters);

  if (products.length === 0) {
    return (
      <p data-testid="no-results">
        Nothing matched. <a href="/search">Clear the filters</a>.
      </p>
    );
  }

  return (
    <>
      <p aria-live="polite" data-testid="result-count" style={{ color: "var(--ink-soft)" }}>
        {products.length} {products.length === 1 ? "product" : "products"}
      </p>
      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </ul>
    </>
  );
}
