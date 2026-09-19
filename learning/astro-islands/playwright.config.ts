import { defineConfig, devices } from "@playwright/test";

const PORT = 5191;

/**
 * Against a production build, like the Next module and for the same reason.
 * `astro dev` serves everything through Vite with a client runtime attached,
 * so a dev page has JavaScript on it whatever the directives say. The whole
 * claim of this module is about which JavaScript ships, and only the built
 * output can answer that.
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
    // `vite preview`, not `astro preview`.
    //
    // Astro 7's preview server daemonises: it forks, prints a pid, and the
    // foreground process exits. Playwright sees that as "Process from
    // config.webServer exited early" and gives up, even though the server is
    // running perfectly well on the port. There is a `--background` flag but
    // no `--foreground` one.
    //
    // Astro's output is plain static files, so any static server will do, and
    // Vite is already a dependency of this repo.
    command: "npm run build && npm run preview:static",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
