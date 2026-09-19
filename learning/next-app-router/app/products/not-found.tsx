import Link from "next/link";

/**
 * Rendered when `notFound()` is thrown anywhere under `/products`, with a 404
 * status. Colocated with the routes it covers, the way an error boundary is.
 */
export default function ProductNotFound() {
  return (
    <main data-testid="not-found">
      <h1>No such product</h1>
      <p>
        <Link href="/products">Back to the list</Link>
      </p>
    </main>
  );
}
