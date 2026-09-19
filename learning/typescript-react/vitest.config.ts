import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("typescript-react");

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    // The only module in the repo that turns this on. A lesson about types
    // should assert types, and `expectTypeOf` assertions in a `.test-d.ts` file
    // are only checked when Vitest runs tsc for them. Without this they are
    // dead code that always "passes".
    typecheck: {
      enabled: true,
      include: ["**/*.test-d.tsx"],
      tsconfig: "./tsconfig.json",
    },
  },
});
