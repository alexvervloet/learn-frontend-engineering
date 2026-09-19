import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps are uploaded to the error tracker and not served. Lesson 04
    // is about why "hidden" rather than true or false.
    sourcemap: "hidden",
  },
});
