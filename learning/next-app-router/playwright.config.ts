import { defineConfig, devices } from "@playwright/test";

const PORT = 5190;

/**
 * Against a production build, not `next dev`.
 *
 * Streaming, caching and static generation all behave differently in
 * development: dev compiles on demand, disables most caching and renders
 * everything dynamically. A suite that passes against `next dev` says very
 * little about what users get. `npm run build && npm run start` is slower to
 * start and is the only honest target.
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
