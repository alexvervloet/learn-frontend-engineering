// Every learning module's vitest.config.ts is the same three settings, so they
// live here once.
//
// `name` is what shows up in the reporter when the root `npm test` runs all
// workspaces together, which is the only way to tell two identically named test
// files apart.
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import type { UserConfig } from "vitest/config";

const setupFiles = [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))];

export function reactProject(name: string): UserConfig {
  return {
    plugins: [react()],
    test: {
      name,
      globals: true,
      // jsdom over happy-dom: slower, but its layout and event behaviour is the
      // closer match to a real browser, and lessons about focus and scrolling
      // depend on that.
      environment: "jsdom",
      setupFiles,
    },
  };
}
