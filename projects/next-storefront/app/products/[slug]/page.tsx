import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/AddToCart";
import { getProduct, getSlugs } from "@/lib/catalogue";
import { formatMoney } from "@/lib/money";

/**
 * Prerendered at build time, one file per product, then refreshed in the
 * background.
 *
 * With `cacheComponents` on, the old `export const revalidate = 60` is a
 * build error. Caching moved from a per-route setting to a per-function
 * one: the `"use cache"` in `lib/catalogue.ts` marks the data as cacheable
 * and `cacheLife` sets how long. The trade is the same and it is worth
 * stating: a price change is visible within a minute, not instantly.
 *
 * A slug that is not in the list below still renders, on demand, and is
 * cached from then on.
 */
export async function generateStaticParams() {
  return (await getSlugs()).map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

/**
 * params is a Promise in Next 16. Awaiting it here and in the page means the
 * two can run their data fetches concurrently rather than in series.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (product === null) return { title: "Not found" };

  return { title: product.name, description: product.blurb };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug);
  // notFound() throws, which renders the nearest not-found.tsx and responds
  // 404. Returning null instead would send a 200 with an empty page, and
  // search engines would index it.
  if (product === null) notFound();

  return (
    <article className="max-w-xl">
      <nav aria-label="Breadcrumb" className="text-sm" style={{ color: "var(--ink-soft)" }}>
        <a href="/products">Products</a> / {product.name}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold">{product.name}</h1>
      <p className="mt-2" style={{ color: "var(--ink-soft)" }}>
        {product.blurb}
      </p>

      <p className="mt-4 text-xl font-semibold" data-testid="price">
        {formatMoney(product.price)}
      </p>

      <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }} data-testid="stock">
        {product.stock === 0 ? "Out of stock" : `${String(product.stock)} in stock`} · rated{" "}
        {product.rating.toFixed(1)}
      </p>

      <div className="mt-6">
        <AddToCart slug={product.slug} disabled={product.stock === 0} />
      </div>
    </article>
  );
}
