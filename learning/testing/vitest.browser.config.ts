import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/**
 * Browser mode, deliberately in its own config and its own script.
 *
 * The root `npm test` stays headless and takes about ten seconds across every
 * workspace. Starting a browser would multiply that, and it would mean nobody
 * can run the suite without `playwright install` first. So this is opt in:
 *
 *     npm run test:browser -w learning/testing
 *
 * Only `*.browser.test.tsx` runs here, and the ordinary `vitest.config.ts`
 * excludes that pattern, so no file runs twice and no assertion is duplicated
 * between the two environments. A file exists in one place or the other, and
 * the choice is which questions it asks.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    name: "testing:browser",
    root: fileURLToPath(new URL(".", import.meta.url)),
    include: ["src/**/*.browser.test.tsx"],
    // No jsdom setup file here. jest-dom's matchers come from the browser
    // entry point, and the repo-wide setup stubs ResizeObserver and
    // matchMedia, which are exactly the things this config exists to have for
    // real.
    setupFiles: [fileURLToPath(new URL("./vitest.browser.setup.ts", import.meta.url))],
    browser: {
      enabled: true,
      // A function from @vitest/browser-playwright, not the string
      // `"playwright"`. Vitest 5 moved the providers into their own packages,
      // and the string form fails at startup with "provider was not specified
      // anywhere", which does not obviously mean "you passed a string".
      provider: playwright(),
      // Headless, because the value here is the engine and not watching it.
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
