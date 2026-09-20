import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("bookmark-manager", [
  fileURLToPath(new URL("./vitest.setup.ts", import.meta.url)),
]);

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
