import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("production");

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    // Playwright owns `e2e/`. Without this, Vitest collects those files, fails
    // to resolve `@playwright/test`'s `test` export against its own, and
    // reports "Playwright Test did not expect test.beforeEach() to be called
    // here", which says nothing about the actual cause.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
