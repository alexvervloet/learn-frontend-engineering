/**
 * Transitions and deferred values
 * ===============================
 * Two updates happen when you type into a filter box: the input has to show the
 * new character, and a list of a few thousand rows has to re-render. React used
 * to treat both as equally urgent, so the second one blocked the first and the
 * box felt sticky.
 *
 * Concurrent React lets you say which is which.
 *
 *   useTransition      you own the update: wrap the setState you are willing to
 *                      interrupt, and get an `isPending` flag with it
 *   useDeferredValue   you own the value: React renders the expensive subtree
 *                      with a slightly old copy while the urgent one lands
 *
 * A transition that is still in progress when a newer one starts is thrown
 * away, not queued. That is why the box keeps up: React abandons the render for
 * "rea" the moment you type the "c".
 *
 * Choose between them by what you have. Setting state yourself, in a handler?
 * `useTransition`. Receiving a value as a prop with no setter in sight?
 * `useDeferredValue`.
 *
 * Two things this does not do. It is not a debounce: React starts immediately
 * and throws work away, rather than waiting and hoping. And it does not make
 * the slow render faster. `SLOW_ROWS` below is 20,000 rows of real work, and it
 * costs what it costs. Transitions stop it blocking typing; only doing less
 * work makes it quick, which is the performance module.
 *
 * A stale result is still a result, so mark it. The demo dims the list and sets
 * `aria-busy` while it is behind, because a silently outdated list is worse
 * than a visibly outdated one.
 */
import { useDeferredValue, useMemo, useState, useTransition } from "react";

const SLOW_ROWS = Array.from({ length: 20_000 }, (_, index) => `row ${index}`);

function filterRows(query: string): string[] {
  if (query === "") return SLOW_ROWS.slice(0, 20);
  return SLOW_ROWS.filter((row) => row.includes(query)).slice(0, 20);
}

export function Transitions() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const rows = useMemo(() => filterRows(deferredQuery), [deferredQuery]);

  // True while the list is showing results for an older query than the box.
  const isStale = query !== deferredQuery;

  const [tab, setTab] = useState<"list" | "about">("list");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => startTransition(() => setTab("list"))} aria-pressed={tab === "list"}>
          List
        </button>
        <button
          onClick={() => startTransition(() => setTab("about"))}
          aria-pressed={tab === "about"}
        >
          About
        </button>
        <span className="note" data-testid="pending">
          {isPending ? "switching…" : "idle"}
        </span>
      </div>

      {tab === "about" ? (
        <p>
          Nothing here. The point is the button above: the switch went through
          <code> startTransition</code>, so React was free to interrupt it.
        </p>
      ) : (
        <>
          <label className="row">
            Filter
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="199"
            />
          </label>

          <ul
            data-testid="rows"
            aria-busy={isStale}
            style={{ opacity: isStale ? 0.5 : 1, transition: "opacity 120ms" }}
          >
            {rows.map((row) => (
              <li key={row}>{row}</li>
            ))}
          </ul>

          <p className="note">
            20,000 rows are filtered on every keystroke. Type quickly: the box never stutters, and
            the list fades while it catches up. Delete <code>useDeferredValue</code> and type again
            to feel the difference.
          </p>
        </>
      )}
    </div>
  );
}
