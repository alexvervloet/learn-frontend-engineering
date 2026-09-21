import { defineConfig, devices } from "@playwright/test";

import { PORTS } from "../../config/ports.ts";

const PORT = PORTS["next-storefront"];

/**
 * Against `next build && next start`, never the dev server.
 *
 * Everything this suite is about only behaves correctly in a production
 * build: prerendering, the cache profiles, and streaming. `next dev`
 * renders everything on demand, so a test of ISR against it would pass
 * whatever the caching config said.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run build && npm run start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
