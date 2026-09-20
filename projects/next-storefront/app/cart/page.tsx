import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/CheckoutForm";
import { QuantityForm } from "@/components/QuantityForm";
import { getProducts } from "@/lib/catalogue";
import { amountToFreeDelivery, cartLines, cartTotals } from "@/lib/cart";
import { readCart } from "@/lib/cart-cookie";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Your bag" };

/**
 * The heading is static and prerendered. Everything below it depends on the
 * cart cookie, so it sits behind a boundary.
 *
 * With `cacheComponents` on, the build refuses to guess: reading
 * `cookies()` outside a Suspense boundary is an error, not a silent
 * downgrade of the whole route to dynamic. That is the change worth
 * noticing. The old model let you make every page in the app dynamic by
 * accident and told you nothing.
 */
export default function CartPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Your bag</h1>
      <Suspense fallback={<p style={{ color: "var(--ink-soft)" }}>Getting your bag…</p>}>
        <CartContents />
      </Suspense>
    </div>
  );
}

async function CartContents() {
  const [cart, catalogue] = await Promise.all([readCart(), getProducts()]);
  const lines = cartLines(cart, catalogue);
  const totals = cartTotals(lines);
  const shortfall = amountToFreeDelivery(totals.subtotal);

  if (lines.length === 0) {
    return (
      <p style={{ color: "var(--ink-soft)" }} data-testid="empty-bag">
        Nothing in it yet. <a href="/products">Have a look</a>.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Items in your bag</caption>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th scope="col" className="py-2 text-left font-medium">
              Item
            </th>
            <th scope="col" className="py-2 text-left font-medium">
              Quantity
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.product.slug}
              style={{ borderBottom: "1px solid var(--line)" }}
              data-testid="cart-line"
            >
              <th scope="row" className="py-3 text-left font-normal">
                <a href={`/products/${line.product.slug}`}>{line.product.name}</a>
                <span className="block" style={{ color: "var(--ink-soft)" }}>
                  {formatMoney(line.product.price)} each
                </span>
              </th>
              <td className="py-3">
                <QuantityForm
                  slug={line.product.slug}
                  quantity={line.quantity}
                  name={line.product.name}
                />
              </td>
              <td className="py-3 text-right tabular-nums">{formatMoney(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section aria-labelledby="totals" className="max-w-xs">
        <h2 id="totals" className="sr-only">
          Totals
        </h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums" data-testid="subtotal">
              {formatMoney(totals.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd className="tabular-nums" data-testid="delivery">
              {totals.delivery === 0 ? "Free" : formatMoney(totals.delivery)}
            </dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums" data-testid="total">
              {formatMoney(totals.total)}
            </dd>
          </div>
        </dl>

        {shortfall === null ? null : (
          <p className="mt-2 text-sm" style={{ color: "var(--ink-soft)" }} data-testid="shortfall">
            {formatMoney(shortfall)} more for free delivery.
          </p>
        )}
      </section>

      <CheckoutForm />
    </div>
  );
}
