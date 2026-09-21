import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { PORTS } from "../../config/ports.ts";

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps are uploaded to the error tracker and not served. Lesson 04
    // is about why "hidden" rather than true or false.
    sourcemap: "hidden",
  },
  // One port per module, from config/ports.ts, so this module's README
  // can name a URL that is still true when another module is running.
  server: { port: PORTS["production"] },
});
