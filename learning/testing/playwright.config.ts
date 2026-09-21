import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

import { PORTS } from "../../config/ports.ts";

// Each module's own dev port, from config/ports.ts, not a block reserved
// here. These were 5180-5182 while the modules themselves all defaulted to
// Vite's 5173, which meant `--strictPort` below bound three ports no README
// mentioned, a dev server you already had running was never the one reused,
// and 5180 is the performance module's documented port while it was starting
// the styling one on it.
const STYLING_PORT = PORTS.styling;
const PERFORMANCE_PORT = PORTS.performance;
const ACCESSIBILITY_PORT = PORTS.accessibility;
const ROUTING_PORT = PORTS.routing;
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

  // One server per module the specs point at. Each spec that is not about the
  // styling module overrides `baseURL` with `test.use`.
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
    {
      command: `npm run dev -w learning/routing -- --port ${ROUTING_PORT} --strictPort`,
      url: `http://localhost:${ROUTING_PORT}`,
      cwd: repoRoot,
      reuseExistingServer: !process.env["CI"],
      timeout: 120_000,
    },
  ],
});
