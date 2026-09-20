import type { NextConfig } from "next";

const config: NextConfig = {
  /**
   * Without this, the whole app is dynamic.
   *
   * The root layout reads the cart cookie, and in the plain model one
   * `cookies()` call anywhere in a tree opts every page under it out of
   * static rendering. The first build of this project rendered all seven
   * routes as `ƒ`, including the product pages that exist to demonstrate
   * ISR. The build output said so; the comment I had written in the layout
   * claimed otherwise.
   *
   * cacheComponents lets a route prerender its static shell and stream the
   * parts that genuinely need the request, as long as those parts sit
   * behind a Suspense boundary. The bag count is one such part.
   */
  cacheComponents: true,
  // npm workspaces hoist dependencies to the repo root, so Next has to be
  // told where this project starts. Without it, it walks up looking for a
  // lockfile and infers the wrong workspace root.
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
};

export default config;
