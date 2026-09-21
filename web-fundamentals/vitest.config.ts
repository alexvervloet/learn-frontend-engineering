import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "web-fundamentals",
    globals: true,
    // Most lessons here touch the DOM directly, so jsdom rather than node.
    // jsdom also supplies requestAnimationFrame, which the event-loop lesson
    // needs: under a plain node environment there is no frame loop and that
    // lesson's test would hang rather than fail.
    environment: "jsdom",
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
});
