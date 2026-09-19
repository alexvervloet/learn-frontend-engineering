// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";

/**
 * Astro with the React integration. The integration is what lets a `.astro`
 * page render a React component; it does not make React the renderer for
 * everything. Pages stay Astro, and React is used for the parts that need to
 * be interactive.
 */
export default defineConfig({
  integrations: [react()],

  /**
   * Astro's default build writes `dist/static/index.html`, and its own preview
   * server quietly serves that for `/static` as well as `/static/`. A plain
   * static server does not: it falls through to the SPA fallback and returns
   * the *index page* with a 200, so a test asserting on `/static` is asserting
   * about the wrong document and says so in a very confusing way.
   *
   * `trailingSlash: "always"` makes the contract explicit, so every link and
   * every test uses the URL the file actually lives at. Worth setting for any
   * static host rather than relying on one server's redirect behaviour.
   */
  trailingSlash: "always",
});
