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
    //
    // `*.browser.test.tsx` belongs to vitest.browser.config.ts, which runs in
    // a real Chromium. Excluding it here is what stops the same file running
    // twice under two environments, where the jsdom pass would fail on every
    // assertion the browser pass exists to make.
    exclude: ["e2e/**", "src/**/*.browser.test.tsx", "node_modules/**", "dist/**"],
  },
});
