/**
 * Mocking, and how little of it you need
 * ======================================
 * Four tools, in the order you should reach for them.
 *
 * **`vi.fn()` for a callback.** A prop the component calls. This is not really
 * mocking; it is providing the collaborator the component asked for. Use it
 * freely.
 *
 *   const onSave = vi.fn();
 *   expect(onSave).toHaveBeenCalledWith({ title: "x" });
 *
 * **`vi.spyOn` to watch something real.** Keeps the original behaviour unless
 * you replace it, and `mockRestore()` puts it back. The usual case is silencing
 * a deliberate `console.error`, or asserting an analytics call without
 * replacing the module.
 *
 * **`vi.mock` to replace a whole module.** The thing that catches everyone:
 * **the call is hoisted to the top of the file**, above your imports, so the
 * factory cannot reference a variable declared later:
 *
 *   const spy = vi.fn();
 *   vi.mock("./analytics", () => ({ track: spy }));   // ReferenceError
 *
 *   const { spy } = vi.hoisted(() => ({ spy: vi.fn() }));   // works
 *   vi.mock("./analytics", () => ({ track: spy }));
 *
 * `vi.hoisted` runs the initialiser at the top too, so the variable exists by
 * the time the factory does. The error you get without it says "Cannot access
 * 'spy' before initialization", from a line that looks fine.
 *
 * **Fake timers for anything on a clock.** Debounces, polling, timeouts. Pair
 * with `userEvent.setup({ advanceTimers })` *and* `shouldAdvanceTime: true`, or
 * user-event waits forever on a frozen clock.
 *
 * **What not to mock.** The network. A module mock for `fetch` tests a version
 * of your code with a seam cut into it, and it goes stale the moment the real
 * endpoint changes shape. MSW intercepts at the network layer so the component
 * makes a real request; the data-fetching module does this throughout. The same
 * argument applies to mocking your own modules: every `vi.mock` is a claim
 * about an interface that nothing checks.
 */
import { useEffect, useState } from "react";

import { track } from "../analytics";

export function SearchBox({ debounceMs = 300 }: { debounceMs?: number }) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);

  useEffect(() => {
    if (query === "") return;

    const timer = setTimeout(() => {
      setSearched(query);
      // The side effect the test will watch.
      track("search", { query });
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return (
    <div className="stack">
      <label className="row">
        Search
        <input
          aria-label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p data-testid="searched">
        {searched === null ? "not searched yet" : `searched: ${searched}`}
      </p>
    </div>
  );
}

export function Mocking() {
  return (
    <div className="stack">
      <SearchBox />

      <p className="note">
        Typing is debounced by 300ms and then reports an analytics event. The test asserts one event
        for a whole word, which is the thing a debounce is for and the thing that breaks silently.
      </p>
    </div>
  );
}
