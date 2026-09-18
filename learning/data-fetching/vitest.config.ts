import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const root = fileURLToPath(new URL(".", import.meta.url));
const base = reactProject("data-fetching", [
  fileURLToPath(new URL("./vitest.setup.ts", import.meta.url)),
]);

export default defineConfig({
  ...base,
  test: { ...base.test, root },
});
