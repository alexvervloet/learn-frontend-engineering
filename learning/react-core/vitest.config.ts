import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("react-core");

export default defineConfig({
  ...base,
  test: { ...base.test, root: fileURLToPath(new URL(".", import.meta.url)) },
});
