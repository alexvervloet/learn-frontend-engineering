/**
 * You might not need an effect
 * ============================
 * The most common bug in a React codebase is state that could have been a
 * calculation. It looks like this:
 *
 *   const [filtered, setFiltered] = useState(items);
 *   useEffect(() => { setFiltered(items.filter(matches(query))); }, [items, query]);
 *
 * Three things are wrong with it, and they compound.
 *
 * 1. **It renders twice per keystroke.** React renders with the old list,
 *    commits it to the DOM, runs the effect, sets state, renders again.
 * 2. **The first frame is wrong.** Between those two renders the user sees
 *    results for the query they had a moment ago.
 * 3. **There are now two sources of truth** that agree only because an effect
 *    keeps them in sync, and they stop agreeing the moment someone adds a code
 *    path that sets one and not the other.
 *
 * The fix is to delete the state and calculate during render. If it turns out to
 * be genuinely expensive, wrap it in `useMemo`. Measure first: filtering a few
 * hundred rows is not expensive.
 *
 *   const filtered = items.filter(matches(query));
 *
 * The same reasoning kills the other big one, "reset my state when this prop
 * changes". Do not write an effect that calls `setState`. Give the component a
 * `key`, and React will throw the old instance away and mount a fresh one. That
 * is the same mechanism as lesson 03, used on purpose.
 *
 * Effects are for synchronising with something outside React: a subscription, a
 * timer, the document title, an analytics call. Lesson 05 is about those.
 */
import { useEffect, useMemo, useState } from "react";

import { useRenderCount } from "../useRenderCount";

const ITEMS = ["react", "reducer", "ref", "render", "resume", "suspense", "transition"];

function matches(query: string) {
  return (item: string) => item.toLowerCase().includes(query.toLowerCase());
}

/** The version that mirrors a calculation into state. Do not copy this one. */
function WithEffect({ query }: { query: string }) {
  const [filtered, setFiltered] = useState(ITEMS);
  const renders = useRenderCount();

  useEffect(() => {
    // The lint rule below is the whole lesson. `react-hooks/set-state-in-effect`
    // exists to stop exactly this, and it is switched off here only so the
    // wrong version can be run next to the right one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiltered(ITEMS.filter(matches(query)));
  }, [query]);

  return (
    <div>
      <p className="note">
        renders: <strong data-testid="effect-renders">{renders}</strong>
      </p>
      <ul data-testid="effect-results">
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The version that calculates. One render, never stale. */
function Derived({ query }: { query: string }) {
  const renders = useRenderCount();
  // useMemo here is a demonstration, not a requirement. Seven strings do not
  // need memoising, and the useMemo costs more than the filter.
  const filtered = useMemo(() => ITEMS.filter(matches(query)), [query]);

  return (
    <div>
      <p className="note">
        renders: <strong data-testid="derived-renders">{renders}</strong>
      </p>
      <ul data-testid="derived-results">
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function NoEffectNeeded() {
  const [query, setQuery] = useState("");

  return (
    <div className="stack">
      <label className="row">
        Filter
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="re" />
      </label>

      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <section>
          <h3>State plus an effect</h3>
          <WithEffect query={query} />
        </section>
        <section>
          <h3>Calculated during render</h3>
          <Derived query={query} />
        </section>
      </div>

      <p className="note">
        Type a letter. The left counter goes up by two and the right by one, every time.
      </p>
    </div>
  );
}
