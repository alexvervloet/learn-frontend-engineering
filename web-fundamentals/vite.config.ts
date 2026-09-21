import { defineConfig } from "vite";

import { PORTS } from "../config/ports.ts";

// No plugins. This module has no JSX and no framework, which is the point of it.
export default defineConfig({
  // One port per module, from config/ports.ts, so this module's README
  // can name a URL that is still true when another module is running.
  server: { port: PORTS["web-fundamentals"] },
});
