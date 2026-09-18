// Root test entry point. `npm test` runs every workspace's suite in one pass and
// labels each result with the project name from its own vitest.config.ts.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "web-fundamentals", "learning/*", "projects/*"],
  },
});
