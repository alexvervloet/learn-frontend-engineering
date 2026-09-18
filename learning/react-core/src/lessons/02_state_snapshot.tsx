/**
 * State is a snapshot, not a variable
 * ===================================
 * `count` is not a box React reads from. It is a value that was baked into this
 * particular call of your function and will never change for the life of that
 * call. Setting state schedules a *new call* with a *new value*.
 *
 * So this does not add three:
 *
 *   setCount(count + 1);   // count is 0 here, and stays 0 for this whole render
 *   setCount(count + 1);   // still 0. schedules 1 again
 *   setCount(count + 1);   // still 0. schedules 1 again
 *
 * All three schedule "set it to 1". The updater form reads the value React is
 * about to have rather than the one this render captured:
 *
 *   setCount((c) => c + 1);   // three of these add three
 *
 * The same capture is what makes a `setTimeout` show an old number. The
 * callback closed over the value at the moment it was created, and no amount of
 * clicking afterwards changes what that closure holds. That is not a React
 * quirk; it is what a closure is. React just makes you meet it early.
 *
 * Rule of thumb: if the next state depends on the current state, use the
 * updater. It is never wrong, and it is the only version that survives being
 * called twice in a row.
 */
import { useState } from "react";

export function StateSnapshot() {
  const [count, setCount] = useState(0);
  const [captured, setCaptured] = useState<number | null>(null);

  function addThreeByValue(): void {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function addThreeByUpdater(): void {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function readInOneSecond(): void {
    // `count` here is this render's value. Clicking +1 five times while the
    // timer runs does not change what this closure holds.
    setTimeout(() => setCaptured(count), 1000);
  }

  return (
    <div className="stack">
      <p>
        count: <strong data-testid="count">{count}</strong>
      </p>

      <div className="row">
        <button onClick={() => setCount(count + 1)}>+1</button>
        <button onClick={addThreeByValue}>+3 by value (adds 1)</button>
        <button onClick={addThreeByUpdater}>+3 by updater (adds 3)</button>
        <button onClick={readInOneSecond}>Read count in 1s</button>
      </div>

      <p className="note">
        Press “Read count in 1s”, then press +1 as fast as you can. The number that appears is
        the one from the render where you clicked, not the current one.
      </p>
      <p data-testid="captured">
        {captured === null ? "nothing captured yet" : `captured: ${captured}`}
      </p>
    </div>
  );
}
