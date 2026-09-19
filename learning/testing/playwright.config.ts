import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const PORT = 5180;
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/**
 * These tests point at the **styling** module, not at this one, on purpose.
 *
 * That module's README says several of its claims cannot be checked in jsdom:
 * container queries, cascade layers and theme tokens all need real layout and a
 * real cascade. This is where those claims get checked. A test suite that says
 * "you would have to verify this in a browser" and then never does is not much
 * better than no test.
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
    baseURL: `http://localhost:${PORT}`,
    // A trace for a failed run is the difference between "flaky, rerun it" and
    // knowing what happened. On first retry only, so passing runs cost nothing.
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run dev -w learning/styling -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    cwd: repoRoot,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
