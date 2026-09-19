/**
 * Bundle size
 * ===========
 * Every kilobyte is downloaded, parsed and executed before anything happens,
 * and on a mid-range Android on a slow connection the parse is often worse than
 * the download. This is the one performance problem that affects every user on
 * every visit, and the one people measure least.
 *
 * **Look at it before you change anything.** `npm run analyse` in this module
 * runs the build with `rollup-plugin-visualizer` and writes a treemap to
 * `dist/stats.html`. Open it and the answer is usually obvious and surprising:
 * one date library, one icon set imported wholesale, one copy of something
 * that is already in the bundle twice at different versions.
 *
 * **The four things that are usually wrong.**
 *
 * *A whole library for one function.* `import { format } from "date-fns"` is
 * fine because it tree-shakes; `import moment from "moment"` is 70KB and does
 * not. Check before adding, not after.
 *
 * *A barrel file that defeats tree shaking.* `export * from "./everything"`
 * makes the bundler include modules with side effects it cannot prove are
 * unused. Import from the file, not the index.
 *
 * *Two copies of the same dependency.* Different versions resolved for
 * different packages. The treemap shows it immediately, and this repo's npm
 * workspaces hoist to one copy at the root, which is most of why React is not
 * duplicated here.
 *
 * *Something big behind a click, loaded up front.* A chart library, an editor,
 * a PDF viewer, a date picker, a map. Each one belongs behind a dynamic
 * `import()`, and the routing module's `lazy` is the route-level version. This
 * lesson does the component-level version below: the heavy panel is a separate
 * chunk, and the build output proves it.
 *
 * **What to measure.** Gzipped or brotlied transfer size, not the raw number:
 * that is what crosses the network. And the *initial* bundle rather than the
 * total, because a lazily loaded chunk costs nothing until it is asked for.
 *
 * **Set a budget and fail the build on it.** A number in CI is the only thing
 * that stops a bundle growing 5KB per pull request forever. The check need not
 * be sophisticated; a byte count against a ceiling catches the regression, and
 * the conversation about whether to raise the ceiling is the point.
 */
import { Suspense, lazy, useState } from "react";

// A separate chunk. Nothing about it reaches the initial bundle, and the
// build output has a file to prove it.
const HeavyChart = lazy(() => import("./05_heavy_chart"));

export function BundleSize() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div className="stack">
      <h3>Deferring what most visitors never open</h3>

      <button onClick={() => setShowChart(true)} disabled={showChart}>
        Load the chart
      </button>

      {showChart && (
        <Suspense fallback={<p data-testid="chart-fallback">fetching the chunk…</p>}>
          <HeavyChart />
        </Suspense>
      )}

      <h3>Reading the output</h3>
      <p>
        <code>npm run analyse -w learning/performance</code> writes <code>dist/stats.html</code>.
        Open it and look for one big rectangle you did not expect, the same package appearing twice,
        and anything in the initial chunk that belongs behind a click.
      </p>

      <ul>
        <li>Measure gzipped transfer size, not the raw bytes.</li>
        <li>Measure the initial chunk, not the total.</li>
        <li>Put a ceiling on it in CI, or it grows forever.</li>
      </ul>

      <p className="note">
        The chart above is a real separate chunk. Check the network tab: it is requested on the
        click, and it is not in <code>index.js</code>.
      </p>
    </div>
  );
}
