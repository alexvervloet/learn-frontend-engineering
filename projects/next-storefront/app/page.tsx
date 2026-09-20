import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/catalogue";

/**
 * A Server Component that awaits its own data. No useEffect, no loading
 * state, no client cache: the HTML arrives with the products in it.
 *
 * This is the shape most of the app takes, and the reason the client bundle
 * for this page is React's runtime and almost nothing else.
 */
export default async function HomePage() {
  const products = await getProducts();
  const featured = products.filter((product) => product.rating >= 4.5);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Things for a desk</h1>
        <p className="mt-2" style={{ color: "var(--ink-soft)" }}>
          Eight products, one cookie, and no client-side data fetching anywhere.
        </p>
      </section>

      <section aria-labelledby="featured">
        <h2 id="featured" className="text-lg font-semibold">
          Well reviewed
        </h2>
        <ul className="mt-3 grid list-none gap-4 p-0 sm:grid-cols-2">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </ul>
      </section>
    </div>
  );
}
