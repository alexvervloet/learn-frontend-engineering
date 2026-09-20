import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Node, not jsdom, and no React plugin.
 *
 * Everything worth unit-testing here is a pure function on plain data: the
 * cart rules, the filters, the money. The components are Server Components
 * that await request data, which no jsdom renderer can produce, so they are
 * tested in Playwright against a real server. Pretending otherwise would
 * mean mocking `cookies()` and asserting against the mock.
 */
export default defineConfig({
  test: {
    root: fileURLToPath(new URL(".", import.meta.url)),
    environment: "node",
    include: ["lib/**/*.test.ts"],
    name: "next-storefront",
  },
  resolve: {
    alias: {
      // `import "server-only"` throws outside a Server Component. Under
      // Vitest there is no such context, so it is stubbed with an empty
      // module. The alternative is not testing the catalogue at all.
      "server-only": fileURLToPath(new URL("./test/server-only.ts", import.meta.url)),
      "next/cache": fileURLToPath(new URL("./test/next-cache.ts", import.meta.url)),
    },
  },
});
