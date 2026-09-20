import type { Metadata } from "next";

import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Everything</h1>
      <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </ul>
    </div>
  );
}
