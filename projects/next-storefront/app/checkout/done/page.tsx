import type { Metadata } from "next";

export const metadata: Metadata = { title: "Order placed" };

export default function DonePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold" data-testid="order-done">
        That is ordered
      </h1>
      <p className="mt-2" style={{ color: "var(--ink-soft)" }}>
        Nothing was actually charged and nothing is coming. <a href="/products">Back to the shop</a>
        .
      </p>
    </div>
  );
}
