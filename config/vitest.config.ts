import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * The repo's own tests, as opposed to any one module's.
 *
 * There is exactly one kind of claim that belongs here: something the README
 * files assert about the repo as a whole, which no single workspace owns and
 * which therefore nothing was checking. `ports.test.ts` is the first.
 *
 * The node environment, because none of this touches a DOM.
 */
export default defineConfig({
  test: {
    name: "repo",
    environment: "node",
    root: fileURLToPath(new URL("..", import.meta.url)),
    include: ["config/**/*.test.ts"],
  },
});
