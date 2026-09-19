import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("rendering-strategies");

/**
 * jsdom is still the default, because the hydration lessons need a DOM. The
 * server-rendering tests opt into the node environment per file with a
 * docblock:
 *
 *   // @vitest-environment node
 *
 * That matters more than it looks. `renderToString` and
 * `renderToReadableStream` are what a server runs, and running them in jsdom
 * would let a component reach for `window` and pass a test that would crash in
 * production.
 */
export default defineConfig({
  ...base,
  test: { ...base.test, root: fileURLToPath(new URL(".", import.meta.url)) },
});
