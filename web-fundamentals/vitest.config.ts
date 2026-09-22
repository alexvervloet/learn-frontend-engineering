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
    // Playwright owns `e2e/`, and Vitest's default include matches `.spec.ts`
    // as well as `.test.ts`, so without this it picks those files up and
    // fails with "Playwright Test did not expect test.describe() to be called
    // here", which says nothing about the actual cause.
    //
    // Every other workspace with an `e2e/` directory does the same, one way
    // or another, and `config/workspaces.test.ts` now asserts that they all
    // do rather than leaving it to whoever adds the next one.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
