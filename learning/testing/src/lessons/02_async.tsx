/**
 * Waiting, and the three ways to do it
 * ====================================
 *
 *   getBy…     it is there now. Throws immediately if not
 *   queryBy…   it may not be there. Returns null. The only one for absence
 *   findBy…    it will be there soon. Retries until a timeout, returns a promise
 *
 * Getting these wrong produces the two most common bad tests.
 *
 * **`getBy` for something that has not arrived yet** fails instantly with
 * "Unable to find an element", and the usual reaction is to add a `waitFor`
 * around it. `findBy` is the same thing, built in, and reads better.
 *
 * **`queryBy` to assert something exists.** `expect(queryByText("x")).toBeInTheDocument()`
 * works, but when it fails the message is "expected null to be in the
 * document", which tells you nothing. `getBy` fails with the full DOM printed.
 * Use `queryBy` *only* for `not.toBeInTheDocument()`.
 *
 * **`waitFor` is for assertions that are not about finding an element**: a spy
 * having been called, a store having been updated, a value having settled. Keep
 * one assertion in it, and never a side effect: the callback runs repeatedly,
 * so a `userEvent.click` inside a `waitFor` can fire several times.
 *
 * **`waitForElementToBeRemoved`** asserts a thing was there and then went. It
 * throws if the element was never present, which catches the test that passes
 * because the spinner it was waiting for never rendered.
 *
 * **The act warning.** "An update to X was not wrapped in act(...)" means state
 * changed after your test stopped looking: a promise resolving after the
 * assertion, a timer firing after the test ended. It is a real bug in the test
 * almost every time, usually a missing `await`. Silencing it hides the next
 * one. Testing Library already wraps `render` and `user-event`, so you rarely
 * write `act` yourself, and when you do it usually means something is escaping
 * React's knowledge.
 *
 * `findBy` defaults to a one-second timeout. On a loaded CI machine that is not
 * always enough for a debounce plus a request, and the honest fix is a longer
 * timeout on that query rather than a global one.
 */
import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "done" | "failed";

export function Loader({
  shouldFail = false,
  delay = 200,
}: {
  shouldFail?: boolean;
  delay?: number;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    // The rule is right in general, and this component exists to produce a
    // loading state for the queries beside it to wait on. Fetching in an
    // effect means setting state in an effect; see the data-fetching module
    // for what following the rule properly looks like.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");

    const timer = setTimeout(() => {
      if (cancelled) return;
      if (shouldFail) setStatus("failed");
      else {
        setItems(["alpha", "beta", "gamma"]);
        setStatus("done");
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldFail, delay]);

  return (
    <div>
      {status === "loading" && <p data-testid="spinner">loading…</p>}
      {status === "failed" && <p role="alert">it went wrong</p>}
      {status === "done" && (
        <ul data-testid="items">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Async() {
  const [key, setKey] = useState(0);
  const [fail, setFail] = useState(false);

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => setKey((current) => current + 1)}>Load again</button>
        <label className="row">
          <input
            type="checkbox"
            checked={fail}
            onChange={(event) => setFail(event.target.checked)}
          />
          Make it fail
        </label>
      </div>

      <Loader key={key} shouldFail={fail} />

      <p className="note">
        A spinner, then a list or an error. The test beside this file asserts the spinner was there
        and then left, which is stronger than asserting the list arrived.
      </p>
    </div>
  );
}
