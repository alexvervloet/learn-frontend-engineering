import { notFound } from "next/navigation";

import { AddToBasket } from "@/components/AddToBasket";
import { getProduct } from "@/lib/data";

/**
 * The client boundary
 * ===================
 * This page is a Server Component. `AddToBasket` is a client one, marked at
 * the top of its own file with `"use client"`. The boundary is the file, not
 * the import: marking a file makes it and everything it imports part of the
 * client bundle.
 *
 * **Push the boundary down.** A common mistake is putting `"use client"` at
 * the top of the page because one button needs state, which sends the whole
 * page to the browser. Make the button the client component instead. The unit
 * of interactivity is a leaf.
 *
 * **Only serialisable things cross.** Props passed from a server component to
 * a client one go through React's serialisation, so:
 *
 *   yes   strings, numbers, booleans, null, plain objects and arrays of those,
 *         Dates, Maps, Sets, promises, and other JSX
 *   no    functions, class instances, Symbols
 *
 * The exception is functions marked `"use server"`, which are passed as a
 * reference the client can call. That is what a server action is.
 *
 * **JSX crosses too**, which is the escape hatch people miss. A client
 * component can take `children` that were rendered on the server, so a client
 * accordion can wrap server-rendered content without that content becoming
 * client code.
 *
 * `notFound()` throws, and Next catches it to render the nearest `not-found`
 * boundary with a 404 status. It is the framework's version of throwing a
 * Response, which the routing module did by hand.
 */
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  // `params` is a promise in Next 15+, because a route can be rendered before
  // its parameters are known.
  const { slug } = await params;
  const product = await getProduct(slug);

  if (product === null) notFound();

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>
        <strong>{product.price}</strong> · {product.stock} in stock
      </p>

      {/* A client leaf inside a server page. Only these props cross the
          boundary, and every one of them is serialisable. */}
      <AddToBasket name={product.name} maximum={product.stock} />

      <p className="note">
        The heading, the description and the stock count came from the server with no JavaScript.
        The counter below them is the only interactive thing on the page, and the only thing in the
        bundle.
      </p>
    </main>
  );
}
