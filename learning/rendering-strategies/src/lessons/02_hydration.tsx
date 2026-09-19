/**
 * Hydration, and how it breaks
 * ============================
 * The server sends markup. The client then runs the same components over the
 * same DOM and attaches the event handlers, rather than rebuilding it:
 *
 *   hydrateRoot(container, <App />)     not createRoot(...).render(...)
 *
 * Until that finishes, the page is visible and does nothing. Buttons are
 * painted and unresponsive. That gap is the cost of server rendering, and it is
 * why shipping less JavaScript still matters when you are not client-rendering.
 *
 * **A mismatch is when the client's first render disagrees with the markup.**
 * React 19 logs an error, throws the server's markup away for that subtree, and
 * re-renders it on the client. The page usually looks right, which is why these
 * ship: the only symptom is a console error and a slower first paint.
 *
 * The four causes, in order of how often they happen:
 *
 *   Date.now(), Math.random(), new Date().toLocaleString()
 *       different on the server and a moment later on the client. A localised
 *       date is the sneakiest: the server's timezone is not the user's
 *   typeof window !== "undefined"
 *       renders one thing on the server and another on the client, by
 *       construction. This is the bug, not the workaround
 *   localStorage or a cookie read during render
 *       the server has neither
 *   invalid HTML nesting
 *       a <div> inside a <p>. The browser fixes the markup while parsing, so
 *       the DOM React hydrates is not the DOM it was sent
 *
 * **The fix is almost never to branch on the environment.** Render the same
 * thing on both, then change it in an effect, which runs only on the client:
 *
 *   const [now, setNow] = useState<string | null>(null);
 *   useEffect(() => setNow(new Date().toLocaleString()), []);
 *
 * The first client render matches the server, and the timestamp appears a beat
 * later. `suppressHydrationWarning` silences one element where a difference is
 * genuinely expected; it does not fix anything, and using it on a subtree is a
 * way to hide the next mismatch.
 *
 * **Report them from production.** React hands recoverable errors, mismatches
 * included, to a callback on the root:
 *
 *   hydrateRoot(container, <App />, {
 *     onRecoverableError: (error) => reportToSentry(error),
 *   });
 *
 * Without it they go to `console.error`, which means they exist only in the
 * consoles of users who are not looking at them. The tests beside this file
 * use the same callback, because spying on the console catches nothing.
 */
import { useEffect, useState } from "react";

/** Stable across server and client. Hydrates cleanly. */
export function StableGreeting({ name }: { name: string }) {
  return <p data-testid="stable">Hello {name}</p>;
}

/**
 * Different on every render. The classic mismatch.
 *
 * `react-hooks/purity` flags this, correctly, and that is worth noticing: the
 * rule that exists to keep the React Compiler able to optimise your components
 * is the same rule that keeps hydration working. Impure render, no
 * optimisation, and a mismatch on the server. One cause, three symptoms.
 *
 * A counter rather than `Date.now()`, and the reason is a lesson in itself.
 * `Date.now()` is the canonical example, and on a fast machine the server
 * render and the client render land in the *same millisecond*, so the two
 * outputs match and there is no mismatch to observe. The test built on it
 * failed roughly one run in three. A counter differs every time, which is
 * what the demonstration needs.
 */
let renderNumber = 0;

export function UnstableTimestamp() {
  // `react-hooks/globals` catches this, and it is the same finding as the
  // purity rule it replaced: mutating something outside the component during
  // render is impure, which is exactly what produces a mismatch. The rule is
  // right; the component exists to be wrong.
  // eslint-disable-next-line react-hooks/globals
  renderNumber += 1;

  // Stands in for Date.now(), Math.random(), or anything else that differs
  // by the time the client runs it.
  return <p data-testid="unstable">Rendered at {`t${renderNumber}`}</p>;
}

/** The fix: same on both, then updated by an effect. */
export function ClientOnlyTimestamp() {
  const [renderedAt, setRenderedAt] = useState<string | null>(null);

  useEffect(() => {
    // `react-hooks/set-state-in-effect` flags this, and the tension is real
    // and worth naming: the recommended fix for a hydration mismatch *is* a
    // setState in an effect. The rule is aimed at state derived from props,
    // where a calculation would do. Here the value genuinely does not exist
    // until the client is running, and one extra render is the price of
    // matching the server on the first one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRenderedAt(new Date().toLocaleTimeString());
  }, []);

  return (
    <p data-testid="client-only">
      {renderedAt === null ? "Rendered at …" : `Rendered at ${renderedAt}`}
    </p>
  );
}

export function Hydration() {
  return (
    <div className="stack">
      <StableGreeting name="Ada" />
      <ClientOnlyTimestamp />

      <h3>The four causes</h3>
      <ol>
        <li>
          <code>Date.now()</code>, <code>Math.random()</code>, a localised date
        </li>
        <li>
          Branching on <code>typeof window</code>
        </li>
        <li>
          Reading <code>localStorage</code> or a cookie during render
        </li>
        <li>Invalid nesting the browser silently repairs while parsing</li>
      </ol>

      <p className="note">
        The tests beside this file hydrate real server markup and assert that a mismatch is reported
        and recovered from. That is the only way to see one without a server.
      </p>
    </div>
  );
}
