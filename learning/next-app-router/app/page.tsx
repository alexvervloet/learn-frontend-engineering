import Link from "next/link";

/**
 * Everything in `app/` is a Server Component by default. This file has no
 * `"use client"`, so none of it is sent to the browser as JavaScript: Next
 * renders it on the server and streams the result.
 *
 * The four pages linked below are the lesson, and each one is documented in
 * the file that implements it.
 */
export default function Overview() {
  return (
    <main>
      <h1>Next 16, App Router</h1>

      <p>
        Everything in <code>app/</code> is a Server Component unless it says{" "}
        <code>&quot;use client&quot;</code>. That default is the whole design: components that only
        render run on the server and ship no JavaScript, and you opt individual leaves into the
        browser.
      </p>

      <h2>The pages</h2>
      <ul>
        <li>
          <Link href="/products">Server Components</Link> — data fetched with <code>await</code> in
          the component, and no <code>useEffect</code>
        </li>
        <li>
          <Link href="/streaming">Streaming</Link> — a slow section behind Suspense while the rest
          of the page paints
        </li>
        <li>
          <Link href="/actions">Server actions</Link> — a form that posts to a function, with no API
          route
        </li>
      </ul>

      <h2>What is different from the modules before this one</h2>
      <ul>
        <li>
          No <code>index.html</code>. The root layout renders <code>&lt;html&gt;</code> itself.
        </li>
        <li>
          No data-fetching library on most pages: <code>await</code> in the component is the API.
        </li>
        <li>
          No API route for a form: a function marked <code>&quot;use server&quot;</code> is the
          endpoint.
        </li>
        <li>
          The unit of interactivity is a leaf, not the page. A client component inside a server page
          is normal and is the point.
        </li>
      </ul>

      <p className="note">
        The <code>e2e/</code> folder asserts the claims that are only true in a browser: that the
        product page works with JavaScript disabled, that the shell arrives before the slow section,
        and that a server action still submits without a bundle.
      </p>
    </main>
  );
}
