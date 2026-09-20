import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/catalogue";

/**
 * The heading level is a prop, because a card does not know where it sits.
 *
 * Hard-coding `h3` gave a clean nesting on the home page, which has an `h2`
 * above the grid, and an h1-to-h3 jump on /products and /search, which do
 * not. axe calls that `heading-order`, and someone navigating by heading
 * hears a level that does not exist.
 */
export function ProductCard({ product, level = 3 }: { product: Product; level?: 2 | 3 }) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <li
      className="rounded-xl p-4"
      style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
      data-testid="product-card"
    >
      <Heading className="font-medium">
        <a href={`/products/${product.slug}`}>{product.name}</a>
      </Heading>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
        {product.blurb}
      </p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-semibold">{formatMoney(product.price)}</span>
        {product.stock === 0 ? (
          <span className="text-sm" style={{ color: "var(--ink-soft)" }}>
            Out of stock
          </span>
        ) : null}
      </p>
    </li>
  );
}
