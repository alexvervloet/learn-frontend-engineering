import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { PORTS } from "../../config/ports.ts";

export default defineConfig({
  plugins: [react()],
  // One port per module, from config/ports.ts, so this module's README
  // can name a URL that is still true when another module is running.
  server: { port: PORTS["state-management"] },
});
