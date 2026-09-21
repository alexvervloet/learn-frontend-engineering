import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { PORTS } from "../../config/ports.ts";

// Tailwind 4 is a Vite plugin, not a PostCSS plugin with its own config file.
// There is no tailwind.config.js anywhere in this module: the theme is declared
// in CSS with @theme, which lesson 02 is about.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One port per module, from config/ports.ts, so this module's README
  // can name a URL that is still true when another module is running.
  server: { port: PORTS["styling"] },
});
