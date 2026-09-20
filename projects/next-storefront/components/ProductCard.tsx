import { formatMoney } from "@/lib/money";
import type { Product } from "@/lib/catalogue";

export function ProductCard({ product }: { product: Product }) {
  return (
    <li
      className="rounded-xl p-4"
      style={{ background: "var(--raised)", border: "1px solid var(--line)" }}
      data-testid="product-card"
    >
      <h3 className="font-medium">
        <a href={`/products/${product.slug}`}>{product.name}</a>
      </h3>
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
