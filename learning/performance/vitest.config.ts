import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("performance");

/**
 * The tests run with the compiler on too, because lesson 02's whole claim is
 * about what the compiler does. Using the shared `reactProject` plugin here
 * would test uncompiled components and the assertions would be about a build
 * nobody ships.
 */
export default defineConfig({
  ...base,
  plugins: [react({ compiler: true })],
  test: { ...base.test, root: fileURLToPath(new URL(".", import.meta.url)) },
});
