import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Uploaded to the error tracker, never served. See learning/production.
    sourcemap: "hidden",
  },
  server: {
    port: 5200,
    // The real Express API, when you are running it. Without a backend the
    // Service Worker in src/api/browser.ts answers instead, so `npm run dev`
    // works with nothing else running.
    proxy: {
      "/api": {
        target: process.env["VITE_API_PROXY"] ?? "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
