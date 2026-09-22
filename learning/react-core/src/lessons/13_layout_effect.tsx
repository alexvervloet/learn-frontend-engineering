/**
 * useLayoutEffect: the one that runs before the browser paints
 * ============================================================
 * `useEffect` runs *after* the browser has painted. That is what makes it
 * cheap, and it is almost always what you want: the user sees the new screen
 * as soon as it is ready, and the subscription or the analytics call happens
 * a moment later without holding anything up.
 *
 * It is also why an effect that measures the DOM and then moves something
 * produces a visible flash. The sequence is:
 *
 *   render  →  commit  →  **paint**  →  useEffect  →  state change  →  render
 *              →  commit  →  paint
 *
 * The user sees the first paint. For one frame the tooltip is in the wrong
 * place, or the list is scrolled to the top, or the text is the wrong size.
 * Then it jumps. On a fast machine it is a flicker you half-notice and cannot
 * reproduce; on a slow one it is obvious.
 *
 * `useLayoutEffect` runs between the commit and the paint:
 *
 *   render  →  commit  →  **useLayoutEffect**  →  state change  →  render
 *              →  commit  →  paint
 *
 * React runs it synchronously, and if you set state from it React re-renders
 * before handing control back to the browser. The user never sees the
 * intermediate state, because it was never painted. That is the entire
 * difference, and it is the entire reason to use it.
 *
 * **The cost is real and it is the reason this is not the default.** You are
 * doing work in the gap where the browser is trying to paint, on the main
 * thread, with everything blocked. A slow layout effect is a dropped frame,
 * every time. `useEffect` is the default; this is for when a visible flash is
 * worse than a few milliseconds of delay.
 *
 * **When you actually need it.**
 *
 *   measure, then position     a tooltip or popover that has to know its own
 *                              size before it can be placed. Though see the
 *                              styling module: anchor positioning does this
 *                              in CSS now and needs no measurement at all
 *   read scroll, then restore  keeping a chat pinned to the bottom when a
 *                              message arrives
 *   measure, then set state    anything where the first paint would show the
 *                              unmeasured value
 *
 * **When you do not.** Fetching, subscribing, logging, timers, anything
 * asynchronous. None of it is about what the user is looking at, so none of
 * it belongs in front of the paint.
 *
 * **It does not run on the server.** There is no layout to measure and no
 * paint to be ahead of, so React warns about it during server rendering. A
 * component that needs it either guards it or renders a sensible first pass
 * that does not depend on the measurement. The warning is telling you the
 * component has no server-rendered answer, which is worth knowing.
 *
 * The demo below measures a box and writes its width into a label. Both
 * versions end up identical, which is exactly the problem with testing this:
 * the difference is one frame long and jsdom does no layout at all. So the
 * tests here assert the thing that *is* decidable and that actually explains
 * the behaviour, which is the order the hooks run in relative to each other
 * and to the commit.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Records the order a component's hooks and its commit happened in.
 *
 * This is the measuring instrument, the way `useRenderCount` is. An array
 * outside React, written to by the hooks, read by the test.
 */
export type Phase = "render" | "layout-effect" | "effect";

export function recordPhases(): { phases: Phase[]; Probe: () => React.ReactElement } {
  const phases: Phase[] = [];

  function Probe() {
    phases.push("render");

    useLayoutEffect(() => {
      phases.push("layout-effect");
    }, []);

    useEffect(() => {
      phases.push("effect");
    }, []);

    return <p>probe</p>;
  }

  return { phases, Probe };
}

const SIZES = [120, 200, 320] as const;

/**
 * Measure, then label. The measurement lands before the paint, so the label is
 * never briefly wrong.
 *
 * In a real app, reach for this only once you have a flash to remove. The
 * width here could come from CSS, and if it could, it should.
 */
function MeasuredBox({ width }: { width: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  useLayoutEffect(() => {
    // `offsetWidth` forces the browser to compute layout. Doing it here means
    // doing it in front of the paint, which is the whole trade.
    setMeasured(box.current?.offsetWidth ?? null);
  }, [width]);

  return (
    <div className="stack">
      <div
        ref={box}
        data-testid="box"
        style={{
          width,
          padding: "0.5rem",
          border: "2px solid var(--accent)",
          borderRadius: "var(--radius)",
        }}
      >
        a box {width}px wide
      </div>
      <p>
        measured: <strong data-testid="measured">{measured ?? "not yet"}</strong>
      </p>
    </div>
  );
}

export function LayoutEffects() {
  const [width, setWidth] = useState<number>(SIZES[0]);

  return (
    <div className="stack">
      <div className="row">
        <span>width:</span>
        {SIZES.map((size) => (
          <button key={size} onClick={() => setWidth(size)} aria-pressed={width === size}>
            {size}px
          </button>
        ))}
      </div>

      <MeasuredBox width={width} />

      <p className="note">
        Change the width. The number updates in the same frame as the box, because the measurement
        happens between the commit and the paint. With <code>useEffect</code> the box would resize,
        the browser would paint, and the number would catch up one frame later. You would probably
        not see it here. You would see it on a slow phone, and you would not be able to reproduce it
        on your laptop.
      </p>
    </div>
  );
}
