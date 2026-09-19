import { Suspense } from "react";

import { getProduct, getReviews } from "@/lib/data";

/**
 * Streaming, with Suspense
 * ========================
 * `getReviews` takes 700ms. `getProduct` takes 60ms. Without a boundary the
 * whole page waits 700ms before anything is sent, including the title and the
 * price that were ready almost immediately.
 *
 * A `<Suspense>` around the slow part changes that: Next sends the shell with
 * the fallback in it, and pushes the real content into the same response when
 * it resolves. This is the rendering-strategies module's
 * `renderToReadableStream`, with the boundary as the only thing you write.
 *
 * **Where you put the boundary is a performance decision.** Around the reviews
 * and the price paints in 60ms. Around the whole page and it paints in 700ms
 * with a spinner first, which is worse than either. That placement is most of
 * what there is to think about here.
 *
 * **`loading.tsx` is a Suspense boundary for a whole route.** Dropping a
 * `loading.tsx` next to a `page.tsx` wraps that page in one automatically, and
 * is how you get an instant navigation for a route whose data is slow.
 *
 * **An `await` before the boundary blocks everything.** The `await
 * getProduct()` below happens before any JSX is returned, so it is part of the
 * shell and the page cannot paint until it is done. If that were the slow
 * call, no Suspense boundary anywhere further down would help. Fetch the fast
 * things early and push the slow ones behind a boundary.
 *
 * **A static page does not stream, because it has already been rendered.**
 * This page had no dynamic input, so Next prerendered it at build time: the
 * 700ms happened once, during the build, and every visitor got a complete
 * HTML file. The first version of the e2e test failed for exactly that
 * reason, asserting a fallback that no user would ever see.
 *
 * `export const dynamic = "force-dynamic"` below opts out of that so the
 * lesson has something to demonstrate. In an app you would not write it: you
 * would read something request-specific, such as `cookies()`, `headers()` or
 * `searchParams`, and the page would become dynamic on its own. Check the
 * build output, which marks each route:
 *
 *   ○  (Static)   prerendered at build time
 *   ƒ  (Dynamic)  server-rendered on demand
 *
 * If a page you expected to stream is marked ○, it is not streaming and it
 * does not need to.
 *
 * **Streamed content needs JavaScript to appear.** This is the limit of
 * streaming's progressive enhancement, and it is easy to get backwards. React
 * sends the fallback where the boundary is, then sends the real markup further
 * down inside a `hidden` container, and then a tiny inline `$RC(…)` script
 * swaps them. With scripting off, the swap never runs: the content is in the
 * HTML, so a crawler parsing the response finds it, and a person sees the
 * fallback forever. Anything that must render without JavaScript belongs in
 * the shell, outside every boundary.
 *
 * `e2e/streaming.spec.ts` asserts that the title is visible before the reviews
 * are, which is the only assertion that distinguishes this from a page that
 * waits, and it asserts the hidden-container behaviour above too.
 */

/**
 * Only so the lesson can demonstrate request-time streaming. Prefer making a
 * page dynamic by reading something request-specific.
 */
export const dynamic = "force-dynamic";
async function Reviews({ slug }: { slug: string }) {
  const reviews = await getReviews(slug);

  return (
    <ul data-testid="reviews">
      {reviews.map((review) => (
        <li key={review}>{review}</li>
      ))}
    </ul>
  );
}

export default async function StreamingPage() {
  // Fast, and part of the shell. The page cannot paint before this resolves,
  // which is fine at 60ms and would not be at 700ms.
  const product = await getProduct("keyboard");

  return (
    <main>
      <h1 data-testid="title">{product?.name ?? "Unknown"}</h1>
      <p data-testid="price">{product?.price}</p>

      <h2>Reviews</h2>
      <Suspense fallback={<p data-testid="reviews-fallback">loading the reviews…</p>}>
        {/* 700ms. Everything above is already on screen. */}
        <Reviews slug="keyboard" />
      </Suspense>

      <p className="note">
        Throttle the network in devtools and reload. The title and price appear straight away; the
        reviews arrive later, in the same response, with no second request.
      </p>
    </main>
  );
}
