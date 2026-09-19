/**
 * memo, useMemo, useCallback, and what the compiler changed
 * =========================================================
 * The old advice was a chore list. Wrap a child in `memo`, then wrap every
 * object and function you pass it in `useMemo` and `useCallback`, because one
 * unwrapped callback makes the `memo` useless. Miss one and the optimisation
 * silently does nothing; add them everywhere and you pay for a cache on values
 * that were never the problem.
 *
 * **The React Compiler does it for you.** It is on in this module, and it is
 * on in `vite.config.ts` as `react({ compiler: true })`. It rewrites each
 * component to cache its values and its JSX:
 *
 *   function Probe({ n }) {                function Probe(t0) {
 *     return <p>{n}</p>;          →          const $ = _c(2);
 *   }                                        const { n } = t0;
 *                                            let t1;
 *                                            if ($[0] !== n) { t1 = <p>{n}</p>; … }
 *                                            return t1;
 *                                          }
 *
 * Because the *element* is cached, React sees the same element object for an
 * unchanged child and skips re-rendering it. That is what `memo` used to buy,
 * without the wrapper and without the chore list. Lesson 01's expensive panel
 * does not re-render when its sibling's state changes, and nothing in that file
 * is memoised.
 *
 * **It is not magic, and it has a precondition.** The compiler only rewrites
 * components it can prove are pure: no mutating props or state during render,
 * no reading a ref during render, no side effects in the render body. When it
 * cannot prove it, it silently leaves the component alone. So the rules of
 * React stopped being a style guide and became the thing that decides whether
 * you get the optimisation. `eslint-plugin-react-hooks` reports the same
 * violations, which is why this repo fails the build on them.
 *
 * **`"use no memo"`** opts one component out, which is the escape hatch for a
 * component that genuinely depends on being re-created. The demo uses it to
 * show the difference.
 *
 * **What you still write by hand.**
 *
 *   an expensive computation   useMemo still tells it what is worth caching
 *                              when the cost is in the work, not the identity
 *   a stable identity outside React   a value handed to a non-React thing that
 *                              caches on reference: a map instance, a
 *                              WebSocket handler, an IntersectionObserver
 *   useCallback in a dependency array   an effect that must not re-run
 *
 * Everything else is a chore the build now does.
 */
import { useState } from "react";

import { useRenderCount } from "../useRenderCount";

/**
 * One child, used by both parents below. Note where the caching happens: not
 * here. A child cannot memoise itself, and `memo()` only ever compared the
 * props its parent handed it. What the compiler caches is the *element* the
 * parent creates, which is why the directive that matters goes on the parent.
 */
function Child({ label, onPing, testId }: { label: string; onPing: () => void; testId: string }) {
  const renders = useRenderCount();

  return (
    <p>
      {label} · <span data-testid={testId}>{renders}</span> renders{" "}
      <button onClick={onPing}>ping</button>
    </p>
  );
}

/**
 * Compiled. The inline arrow and the element are both cached, so an unrelated
 * state change here does not reach the child.
 */
function CompiledParent({ label }: { label: string }) {
  const [tick, setTick] = useState(0);

  return (
    <div className="stack">
      <div className="row">
        <strong>compiled</strong>
        <button onClick={() => setTick((current) => current + 1)}>
          Re-render this parent ({tick})
        </button>
      </div>
      {/* No useCallback. No memo. The compiler handles both. */}
      <Child label={label} onPing={() => undefined} testId="compiled-renders" />
    </div>
  );
}

/**
 * Opted out, which is what every component looked like before the compiler. A
 * fresh arrow function on every render, a fresh element, and a child that
 * re-renders for nothing.
 */
function UncompiledParent({ label }: { label: string }) {
  "use no memo";

  const [tick, setTick] = useState(0);

  return (
    <div className="stack">
      <div className="row">
        <strong>use no memo</strong>
        <button onClick={() => setTick((current) => current + 1)}>
          Re-render this parent ({tick})
        </button>
      </div>
      <Child label={label} onPing={() => undefined} testId="uncompiled-renders" />
    </div>
  );
}

export function Compiler() {
  const [label, setLabel] = useState("steady");

  return (
    <div className="stack">
      <button onClick={() => setLabel((current) => (current === "steady" ? "changed" : "steady"))}>
        Change the label both parents pass down
      </button>

      <CompiledParent label={label} />
      <UncompiledParent label={label} />

      <p className="note">
        Press each parent&rsquo;s own button a few times. The compiled one&rsquo;s child does not
        move; the opted-out one&rsquo;s child re-renders every time, because its inline callback and
        its element are rebuilt. Press &ldquo;Change the label&rdquo; and both update, because the
        prop really changed. There is no <code>memo</code> or <code>useCallback</code>
        anywhere in this file.
      </p>
    </div>
  );
}
