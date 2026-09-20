import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env["ANALYSE"] === "1"
      ? [visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  build: {
    sourcemap: "hidden",
  },
  server: { port: 5210 },
});
