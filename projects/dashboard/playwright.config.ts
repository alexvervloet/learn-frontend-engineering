import { defineConfig, devices } from "@playwright/test";

import { PORTS } from "../../config/ports.ts";

const PORT = PORTS.dashboard;

/**
 * Against a production build, and in a real browser, because everything in
 * this suite needs something jsdom does not have: layout for the
 * virtualiser, geometry for the crosshair, a cascade for the themes, and a
 * compositor for the contrast axe measures.
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

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The dark theme is a selected set of steps, not an inverted light one,
    // so it gets its own contrast run rather than a screenshot.
    {
      name: "chromium-dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
      testMatch: /theme\.spec\.ts/,
    },
  ],

  webServer: {
    command: `npm run build && npx vite preview --outDir dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
