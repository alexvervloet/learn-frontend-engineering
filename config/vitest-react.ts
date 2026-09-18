// Every learning module's vitest.config.ts is the same three settings, so they
// live here once.
//
// `name` is what shows up in the reporter when the root `npm test` runs all
// workspaces together, which is the only way to tell two identically named test
// files apart.
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
// Vitest 5 re-exports Vite's config type under a new name, augmented with the
// `test` key. The plain `UserConfig` from "vitest/config" is gone.
import type { ViteUserConfig } from "vitest/config";

const setupFiles = [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))];

/**
 * `extraSetupFiles` is for a module that needs more than the shared setup, such
 * as data-fetching starting an MSW server. They run after the shared one.
 */

export function reactProject(name: string, extraSetupFiles: string[] = []): ViteUserConfig {
  return {
    plugins: [react()],
    test: {
      name,
      globals: true,
      // jsdom over happy-dom: slower, but its layout and event behaviour is the
      // closer match to a real browser, and lessons about focus and scrolling
      // depend on that.
      environment: "jsdom",
      setupFiles: [...setupFiles, ...extraSetupFiles],
    },
  };
}
