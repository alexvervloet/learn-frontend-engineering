#!/usr/bin/env node
/**
 * A bundle budget that fails the build.
 *
 * A number in CI is the only thing that stops a bundle growing five
 * kilobytes per pull request forever. The check does not need to be clever:
 * a gzipped byte count against a ceiling catches the regression, and the
 * conversation about whether to raise the ceiling is the point of having it.
 *
 * Gzipped, because that is what crosses the network. Raw bytes flatter you
 * by about a factor of three.
 */
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = new URL("../dist/assets/", import.meta.url).pathname;

/**
 * Roughly 20% above where the bundle sits today. Raise them deliberately, in
 * a commit that says why.
 *
 * A budget with a hundred kilobytes of slack is not a budget: it passes
 * until someone adds a charting library, by which point the argument is
 * about whether to remove a dependency that already shipped. The number
 * should bite on the pull request that adds the weight.
 *
 * For reference, adding Recharts to this page would be about +95 KB gzipped
 * and would fail this check on the commit that did it. That is the intended
 * behaviour, not an obstacle: this dashboard draws its own SVG because the
 * chart it needs is a few hundred lines and the library is not.
 */
const BUDGETS = {
  js: 95 * 1024,
  css: 6 * 1024,
};

function gzippedTotal(extension) {
  let total = 0;

  for (const name of readdirSync(DIST)) {
    // Source maps end in `.map`, so they fail this test rather than needing
    // one of their own. That is worth saying because the obvious next line
    // is `if (name.endsWith(".map")) continue`, which can never run: a file
    // called `index-abc.js.map` does not end in `.js`. It sat here for a
    // while looking like it was doing something.
    if (!name.endsWith(extension)) continue;

    const path = join(DIST, name);
    if (!statSync(path).isFile()) continue;
    total += gzipSync(readFileSync(path)).length;
  }

  return total;
}

const results = Object.entries(BUDGETS).map(([kind, budget]) => {
  const actual = gzippedTotal(`.${kind}`);
  return { kind, actual, budget, ok: actual <= budget };
});

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

for (const { kind, actual, budget, ok } of results) {
  const headroom = budget - actual;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${kind.padEnd(4)} ${kb(actual).padStart(9)} gzipped  ` +
      `(budget ${kb(budget)}, ${headroom >= 0 ? "" : "over by "}${kb(Math.abs(headroom))} ${
        headroom >= 0 ? "spare" : ""
      })`,
  );
}

if (results.some((result) => !result.ok)) {
  console.error(
    "\nOver budget. Either find the weight in `npm run analyse` and remove it, " +
      "or raise the ceiling in scripts/check-bundle-size.mjs and say why in the commit.",
  );
  process.exit(1);
}
