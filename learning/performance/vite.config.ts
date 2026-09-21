import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import { PORTS } from "../../config/ports.ts";

/**
 * The React Compiler is on for this module, and only this module.
 *
 * It rewrites components at build time to memoise their values and JSX
 * automatically, which makes most hand-written `memo`, `useMemo` and
 * `useCallback` redundant. Lesson 02 is about what that changes, and it can
 * only show it if the compiler is actually running, so it is enabled here
 * rather than described.
 *
 * It does not run in the other modules, for two reasons. Their lessons are
 * about React's own behaviour and it would quietly change the render counts
 * they assert. And it is worth seeing the difference between a codebase with
 * it and one without.
 *
 * `npm run analyse` writes a treemap of the bundle to dist/stats.html, which
 * is lesson 05.
 */
export default defineConfig({
  plugins: [
    // `compiler: true`, not a babel plugin entry. @vitejs/plugin-react 6
    // transforms with oxc rather than Babel, so there is no `babel` option any
    // more and every "add babel-plugin-react-compiler to your babel plugins"
    // instruction written before it is now wrong. This needs
    // `oxc-transform-react` installed alongside.
    react({ compiler: true }),
    ...(process.env["ANALYSE"] === "1"
      ? [visualizer({ filename: "dist/stats.html", gzipSize: true, brotliSize: true })]
      : []),
  ],
  // One port per module, from config/ports.ts, so this module's README
  // can name a URL that is still true when another module is running.
  server: { port: PORTS["performance"] },
});
