import { defineConfig, devices } from "@playwright/test";

import { PORTS } from "../config/ports.ts";

const PORT = PORTS["web-fundamentals"];

/**
 * The browser suite for the module that needed one most.
 *
 * Everything else here is asserted in jsdom, and jsdom is the wrong instrument
 * for three of these five lessons. It has no Cache Storage, no `Worker`, and
 * no paint, which happen to be exactly the claims this module makes most
 * loudly: that there are five places to put data, that a worker is a second
 * thread, and that blocking the first one stops the page.
 *
 * So this suite is deliberately not a second copy of the unit tests. It covers
 * the things that are true only in a browser, and nothing else.
 *
 * Against the dev server rather than a build. Nothing here depends on
 * production output the way the Astro and Next suites do, and the worker is
 * served as a module either way.
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
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
