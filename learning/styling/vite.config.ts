import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tailwind 4 is a Vite plugin, not a PostCSS plugin with its own config file.
// There is no tailwind.config.js anywhere in this module: the theme is declared
// in CSS with @theme, which lesson 02 is about.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
