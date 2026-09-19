import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const STYLING_PORT = 5180;
const PERFORMANCE_PORT = 5181;
const ACCESSIBILITY_PORT = 5182;
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * These tests point at the **styling** module, not at this one, on purpose.
 *
 * That module's README says several of its claims cannot be checked in jsdom:
 * container queries, cascade layers and theme tokens all need real layout and a
 * real cascade. The performance module says the same about virtualization,
 * where jsdom measures every element as 0×0 and the virtualizer correctly
 * renders nothing. This is where those claims get checked. A test suite that
 * says "you would have to verify this in a browser" and then never does is not
 * much better than no test.
 *
 * Playwright starts the dev server itself, so `npm run e2e` is the whole
 * command. `reuseExistingServer` keeps a server you already have running,
 * which matters when you are iterating.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: `http://localhost:${STYLING_PORT}`,
    // A trace for a failed run is the difference between "flaky, rerun it" and
    // knowing what happened. On first retry only, so passing runs cost nothing.
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  // Two servers, because the specs cover two modules. Each spec that is not
  // about the styling module overrides `baseURL` with `test.use`.
  webServer: [
    {
      command: `npm run dev -w learning/styling -- --port ${STYLING_PORT} --strictPort`,
      url: `http://localhost:${STYLING_PORT}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
    {
      command: `npm run dev -w learning/performance -- --port ${PERFORMANCE_PORT} --strictPort`,
      url: `http://localhost:${PERFORMANCE_PORT}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
    {
      command: `npm run dev -w learning/accessibility -- --port ${ACCESSIBILITY_PORT} --strictPort`,
      url: `http://localhost:${ACCESSIBILITY_PORT}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
  ],
});
