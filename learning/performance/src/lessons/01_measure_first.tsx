/**
 * Measure first
 * =============
 * Almost every React performance fix that gets written was not needed, and the
 * few that were are rarely the ones people guess. Two reasons.
 *
 * **An extra render is usually cheap.** React calling a function and diffing
 * its output against the last one costs microseconds for a small component.
 * "This re-renders too often" is only a problem when the render is expensive
 * or there are thousands of them. Render counts are a diagnostic, not a score.
 *
 * **The expensive thing is usually not React.** A 200ms blocking loop, a
 * 2MB image, an unindexed list filter over 50,000 rows, a synchronous
 * `localStorage` read of a large object: none of those get better by adding
 * `memo`.
 *
 * `<Profiler>` is React's own measurement, and it reports what actually
 * matters:
 *
 *   id            which subtree
 *   phase         "mount" or "update"
 *   actualDuration how long this render took, including descendants
 *   baseDuration   how long it would take with no memoisation at all
 *
 * The pair to look at is `actualDuration` against `baseDuration`. When they
 * are close, memoisation is buying nothing and the work is the work. When
 * `actualDuration` is much smaller, your memoisation is earning its place.
 *
 * The demo renders a genuinely slow list and a cheap one, and reports both. The
 * cheap one re-renders far more often and costs almost nothing; the slow one
 * re-renders rarely and dominates. Optimising the first would be effort spent
 * in the wrong place, and the render counter on its own would have pointed you
 * there.
 *
 * **In the browser, use the React DevTools Profiler** rather than this: record
 * an interaction, look at the flamegraph, and it tells you which component and
 * why it rendered. `<Profiler>` in code is for when you want the number in a
 * test or a log.
 *
 * **And measure in a production build.** Development React is several times
 * slower, StrictMode renders everything twice, and the numbers you get from
 * `npm run dev` will not survive contact with `npm run build`.
 */
import { Profiler, useRef, useState, type ProfilerOnRenderCallback } from "react";

import { useRenderCount } from "../useRenderCount";

export type Measurement = { id: string; phase: string; actualDuration: number };

/** Deliberately slow: real work, not a sleep. */
function expensiveTotal(rows: number): number {
  let total = 0;
  for (let i = 0; i < rows; i += 1) total += Math.sqrt(i) % 7;
  return Math.round(total);
}

function SlowPanel({ rows }: { rows: number }) {
  const renders = useRenderCount();
  const total = expensiveTotal(rows);

  return (
    <p>
      slow total {total} · <span data-testid="slow-renders">{renders}</span> renders
    </p>
  );
}

function CheapPanel({ tick }: { tick: number }) {
  const renders = useRenderCount();

  return (
    <p>
      tick {tick} · <span data-testid="cheap-renders">{renders}</span> renders
    </p>
  );
}

export function MeasureFirst({ onMeasure }: { onMeasure?: (m: Measurement) => void }) {
  const [rows, setRows] = useState(200_000);
  const [tick, setTick] = useState(0);
  const [last, setLast] = useState<Measurement | null>(null);

  // A ref, not state. Setting state from `onRender` re-renders the component,
  // which fires `onRender` again, which sets state again: "Maximum update
  // depth exceeded", on the first render. A profiler callback must not cause
  // the thing it is profiling to re-render.
  const measurements = useRef<Measurement[]>([]);

  const record: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    const measurement = { id, phase, actualDuration };
    measurements.current.push(measurement);
    onMeasure?.(measurement);
  };

  function showLastSlowMeasurement(): void {
    const latest = measurements.current.findLast((entry) => entry.id === "slow");
    setLast(latest ?? null);
  }

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => setTick((current) => current + 1)}>Re-render the cheap panel</button>
        <button onClick={() => setRows((current) => (current === 200_000 ? 400_000 : 200_000))}>
          Change the slow panel&apos;s work
        </button>
        <button onClick={showLastSlowMeasurement}>Show the last measurement</button>
      </div>

      <Profiler id="cheap" onRender={record}>
        <CheapPanel tick={tick} />
      </Profiler>

      <Profiler id="slow" onRender={record}>
        <SlowPanel rows={rows} />
      </Profiler>

      <p className="note" data-testid="last-measurement">
        {last === null
          ? "no measurement yet"
          : `slow panel ${last.phase}: ${last.actualDuration.toFixed(1)}ms`}
      </p>

      <p className="note">
        Press &ldquo;Change the slow panel&rsquo;s work&rdquo;, then &ldquo;Show the last
        measurement&rdquo;. The reading comes out of a ref, because writing it to state from the
        profiler callback would re-render the thing being profiled, forever.
      </p>

      <p className="note">
        Press the first button ten times. The cheap counter climbs and nothing feels different.
        Press the second once and the page stutters. The render count points at the wrong panel.
      </p>
    </div>
  );
}
