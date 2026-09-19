import Link from "next/link";

import { listProducts } from "@/lib/data";

/**
 * A Server Component that fetches its own data
 * ============================================
 * The component is `async` and it `await`s. That is the whole API:
 *
 *   export default async function Products() {
 *     const products = await listProducts();
 *     return …;
 *   }
 *
 * No `useEffect`, no loading state, no `useQuery`, no request waterfall. The
 * data is fetched where it is used, on the server, before anything is sent.
 *
 * **What this buys**, beyond less code:
 *
 * `lib/data.ts` is never bundled. A database client, an API key, an ORM: none
 * of it reaches the browser, and that is enforced by the bundler rather than
 * by remembering to keep it out.
 *
 * The page works with JavaScript disabled. The e2e suite asserts exactly that
 * by turning JavaScript off and loading this route.
 *
 * Fetching is colocated without being a waterfall. Three sibling Server
 * Components each awaiting their own data run concurrently, because React
 * renders them together. It is *nested* awaits that serialise, which is the
 * same rule as anywhere else.
 *
 * **What it costs.** No state, no effects, no event handlers, no browser APIs.
 * A Server Component that needs any of those is not a Server Component; the
 * bit that needs them is a client leaf. See `/products/[slug]`.
 */
export default async function Products() {
  const products = await listProducts();

  return (
    <main>
      <h1>Products</h1>

      <p className="note">
        Fetched with <code>await</code> in the component. View source: the data is in the HTML, and{" "}
        <code>lib/data.ts</code> is not in any bundle.
      </p>

      <ul data-testid="products">
        {products.map((product) => (
          <li key={product.slug}>
            <Link href={`/products/${product.slug}`}>{product.name}</Link> · {product.price}
          </li>
        ))}
      </ul>
    </main>
  );
}
