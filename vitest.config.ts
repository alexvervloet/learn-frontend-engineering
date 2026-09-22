// Root test entry point. `npm test` runs every workspace's suite in one pass and
// labels each result with the project name from its own vitest.config.ts.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Globbed at the config file, not the folder. A bare `learning/*` also
    // matches learning/README.md, and Vitest refuses to start rather than
    // guessing what you meant.
    projects: [
      // The repo's own claims, the ones no single workspace owns.
      "config/vitest.config.ts",
      "packages/*/vitest.config.ts",
      "web-fundamentals/vitest.config.ts",
      "learning/*/vitest.config.ts",
      "projects/*/vitest.config.ts",
    ],
  },
});
