/**
 * What a render actually is
 * =========================
 * A render is React calling your function. That is all it is. It is not a DOM
 * update, and the two are worth keeping apart in your head:
 *
 *   render   React calls the component and gets back a description of the UI
 *   commit   React compares that description to the last one and touches the
 *            DOM only where they differ
 *
 * Most "React is slow" complaints are about extra renders that commit nothing.
 * They still cost something, but far less than people assume, which is why
 * reaching for `memo` before measuring is usually wasted effort.
 *
 * Two behaviours follow, and both are visible in the demo.
 *
 * **Batching.** Three `setState` calls in one event handler produce one render,
 * not three. Since React 18 this holds everywhere, including inside
 * `setTimeout` and promise callbacks. Before 18 it only held inside React event
 * handlers, which is why old code has `flushSync`-shaped workarounds in it.
 *
 * **Bailing out.** Setting state to a value that is `Object.is`-equal to the
 * current one does not schedule work on children. React may still call your
 * component once more before it works that out, so the count can tick once and
 * then stop no matter how often you click.
 */
import { useState } from "react";

import { useRenderCount } from "../useRenderCount";

export function Rendering() {
  const [count, setCount] = useState(0);
  const renders = useRenderCount();

  function addThreeInOneHandler(): void {
    // Three calls, one render. The updater form is what makes all three land;
    // see lesson 02 for why `setCount(count + 1)` three times would not.
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function addThreeAfterAwait(): void {
    // React 18 extended batching to everything, so this is also one render.
    setTimeout(() => {
      setCount((c) => c + 1);
      setCount((c) => c + 1);
      setCount((c) => c + 1);
    }, 0);
  }

  return (
    <div className="stack">
      <p>
        count: <strong data-testid="count">{count}</strong>
      </p>
      <p>
        renders: <strong data-testid="renders">{renders}</strong>
      </p>

      <div className="row">
        <button onClick={() => setCount((c) => c + 1)}>+1</button>
        <button onClick={addThreeInOneHandler}>+3 in one handler</button>
        <button onClick={addThreeAfterAwait}>+3 inside setTimeout</button>
        <button onClick={() => setCount(count)}>Set the same value</button>
      </div>

      <p className="note">
        Both +3 buttons add one render, not three. “Set the same value” stops adding renders
        entirely after the first click. In the browser every number is doubled, because
        StrictMode renders twice in development on purpose.
      </p>
    </div>
  );
}
