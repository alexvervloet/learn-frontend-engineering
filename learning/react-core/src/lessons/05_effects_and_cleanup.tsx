/**
 * Effects, cleanup, and the dependency array
 * ==========================================
 * An effect synchronises your component with something React does not own: a
 * timer, a subscription, a WebSocket, the document title, an analytics call.
 * If there is nothing outside React involved, see lesson 04 first.
 *
 * The part people skip is the return value. An effect does not run once. It
 * runs, and then it runs *again* every time a dependency changes, and the
 * cleanup it returned is what tears down the previous run before the next one
 * starts. Think of it as "connect and disconnect", not "on mount and on
 * unmount".
 *
 *   useEffect(() => {
 *     const id = setInterval(tick, delay);
 *     return () => clearInterval(id);   // runs before the next effect, and on unmount
 *   }, [delay]);
 *
 * Without that `return`, changing `delay` leaves the old interval running and
 * starts a second one. Change it four times and four intervals are firing. The
 * demo does exactly this, and the leaky counter visibly outruns the clean one.
 *
 * **StrictMode makes this impossible to miss, on purpose.** In development React
 * mounts every component, unmounts it, and mounts it again. An effect that
 * cleans up properly is unaffected. An effect that leaks does its damage
 * immediately, on the first render, where you will see it, rather than in
 * production three weeks later.
 *
 * The dependency array is not a performance switch. It is the list of values the
 * effect reads, and leaving one out gives you an effect holding a value from an
 * old render. The lint rule that shouts about this is right essentially always.
 * When it looks wrong, the fix is almost never to silence it: it is to move the
 * function inside the effect, or to reach for the updater form.
 */
import { useEffect, useState } from "react";

type TickerProps = { delay: number; cleanUp: boolean; testId: string };

function Ticker({ delay, cleanUp, testId }: TickerProps) {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    // The updater form, so the interval callback never needs `ticks` as a
    // dependency. Reading `ticks` here instead would mean re-creating the
    // interval on every single tick.
    const id = setInterval(() => setTicks((current) => current + 1), delay);

    if (!cleanUp) return;
    return () => clearInterval(id);
  }, [delay, cleanUp]);

  return (
    <p>
      ticks: <strong data-testid={testId}>{ticks}</strong>
    </p>
  );
}

export function EffectsAndCleanup() {
  const [delay, setDelay] = useState(1000);

  return (
    <div className="stack">
      <div className="row">
        <span>interval:</span>
        {[1000, 500, 250].map((option) => (
          <button
            key={option}
            onClick={() => setDelay(option)}
            aria-pressed={delay === option}
            disabled={delay === option}
          >
            {option}ms
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: "3rem" }}>
        <section>
          <h3>No cleanup</h3>
          <Ticker delay={delay} cleanUp={false} testId="leaky-ticks" />
        </section>
        <section>
          <h3>With cleanup</h3>
          <Ticker delay={delay} cleanUp testId="clean-ticks" />
        </section>
      </div>

      <p className="note">
        Change the interval a few times. The left counter accelerates away, because every change
        left another interval running. It never slows down again, and nothing you click will stop
        it short of a reload.
      </p>
    </div>
  );
}
