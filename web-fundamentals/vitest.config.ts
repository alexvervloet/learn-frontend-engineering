import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web-fundamentals",
    globals: true,
    // Most lessons here touch the DOM directly, so jsdom rather than node.
    // The event-loop lesson overrides this per file with a docblock comment.
    environment: "jsdom",
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
});
