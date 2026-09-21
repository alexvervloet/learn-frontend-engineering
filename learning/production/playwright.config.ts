import { defineConfig, devices } from "@playwright/test";

import { PORTS } from "../../config/ports.ts";

const PORT = PORTS.production;

/**
 * Against a production build, and it has to be.
 *
 * The service worker caches hashed asset filenames, and a Vite dev server
 * serves unhashed module URLs with query strings instead. A caching test
 * against `npm run dev` would be testing a URL shape that never ships.
 *
 * Service workers also need a secure context. `localhost` counts as one, which
 * is the only reason this works without certificates, and it is the same rule
 * that bites on a staging box served over plain http.
 */
export default defineConfig({
  testDir: "./e2e",
  // Not parallel. Every spec here installs a service worker for the same
  // origin, and two workers racing to claim the same clients is a test suite
  // that fails one run in five for reasons that have nothing to do with the
  // code.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run build -w learning/production && npx vite preview --outDir learning/production/dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    cwd: new URL("../..", import.meta.url).pathname,
    reuseExistingServer: !process.env["CI"],
    timeout: 180_000,
  },
});
