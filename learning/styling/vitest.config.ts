import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { reactProject } from "../../config/vitest-react.ts";

const base = reactProject("styling");

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    root: fileURLToPath(new URL(".", import.meta.url)),
    // Vitest skips CSS by default, which is usually right: jsdom does no
    // layout, so processing stylesheets buys nothing and costs time. This
    // module is the exception. With `css` off, importing a CSS module gives
    // back an empty object and `styles.card` is undefined, so a test cannot
    // tell a working class name from a typo.
    css: { include: [/\.module\.css$/] },
  },
});
