import { defineConfig, devices } from "@playwright/test";

const PORT = 5200;

/**
 * Against a production build, not the dev server.
 *
 * Dev serves unbundled modules through Vite with a client runtime attached,
 * so it answers different questions from the thing users get. The build is
 * also where the CSS is generated and the chunks are split, and two of these
 * specs are about exactly that.
 *
 * The mock Service Worker answers the API, so this needs no backend. Point
 * the app at a running Practice-Backends instead by setting
 * `VITE_USE_MOCK=false` and `VITE_API_PROXY`.
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
    command: `npm run build && npx vite preview --outDir dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
