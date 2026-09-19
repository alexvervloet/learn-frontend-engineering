import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("testing");

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    // Playwright owns `e2e/`. Without this, Vitest tries to run those files,
    // fails to resolve `@playwright/test`'s `test` export against its own, and
    // reports a confusing error about hooks outside a suite.
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
