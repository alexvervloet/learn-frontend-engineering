import type { ReactNode } from "react";

/** The app being rendered by every strategy in this module. */
export type Product = { id: string; name: string; price: number };

export const PRODUCTS: Product[] = [
  { id: "1", name: "Keyboard", price: 80 },
  { id: "2", name: "Mouse", price: 40 },
  { id: "3", name: "Monitor", price: 260 },
];

export function ProductList({ products }: { products: Product[] }) {
  return (
    <ul data-testid="products">
      {products.map((product) => (
        <li key={product.id}>
          {product.name} · {product.price}
        </li>
      ))}
    </ul>
  );
}

export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

/**
 * Wraps rendered markup in a document. Two details that matter and are easy to
 * get wrong.
 *
 * The script is `defer`, not inline at the top: a blocking script in the head
 * delays the first paint, which is the whole thing server rendering was for.
 *
 * The data the server used is serialised into the page. Without it the client
 * would fetch the same thing again on hydration, and until it arrived the
 * hydrated tree would not match the server's markup.
 */
export function documentHtml(options: {
  title: string;
  body: string;
  data: unknown;
  scriptUrl?: string;
}): string {
  const { title, body, data, scriptUrl = "/client.js" } = options;

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    `<title>${title}</title>`,
    "</head>",
    "<body>",
    `<div id="root">${body}</div>`,
    // JSON.stringify inside a script tag is an XSS hole if the data can
    // contain "</script>". Escaping the sequence is the minimum; a real app
    // uses a serialiser that handles the rest.
    `<script>window.__DATA__=${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`,
    `<script type="module" src="${scriptUrl}" defer></script>`,
    "</body>",
    "</html>",
  ].join("");
}
