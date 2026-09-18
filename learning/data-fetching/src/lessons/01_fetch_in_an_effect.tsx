/**
 * Fetching in an effect, done properly, and why it is still not enough
 * ===================================================================
 * The version below is not a straw man. It cancels correctly, it handles
 * errors, it sets loading state in the right order. It is what careful code
 * looks like when it fetches in an effect. Both panels in the demo work.
 *
 * Switch tag to "react", then "testing", then back to "react" and watch the
 * request counter. The hand-rolled panel fetches three times. The TanStack Query
 * panel fetches twice, because it already had "react".
 *
 * That is the short version of what a data library is: a cache keyed by what you
 * asked for. Everything else follows from having one.
 *
 *   deduplication        two components asking for the same key make one request
 *   background refetch   show the cached answer now, check for a newer one
 *   retries              with backoff, off in tests, configurable per query
 *   shared state         no lifting fetch state up so a sibling can read it
 *   invalidation         a mutation can say "this key is stale now"
 *
 * There is a second problem in the hand-rolled version, and the lint rule points
 * straight at it: `react-hooks/set-state-in-effect`. Fetching in an effect means
 * setting state in an effect, which means a render, then a commit, then an
 * effect, then more state, then another render. The rule is not wrong. It is
 * telling you this belongs somewhere other than an effect.
 *
 * Under StrictMode in development the hand-rolled version also fires twice on
 * mount. That is React checking your cleanup works, and it is honest: in
 * production the same double-fetch happens whenever an effect re-runs.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listBookmarks } from "../api/client";
import type { Bookmark } from "../api/db";

type Loaded =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: Bookmark[] };

function HandRolled({ tag }: { tag: string }) {
  const [state, setState] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    // Fetching in an effect is setting state in an effect. The rule is right;
    // the panel next door is what following it looks like.
    /* eslint-disable react-hooks/set-state-in-effect */
    setState({ status: "loading" });

    listBookmarks(tag, controller.signal)
      .then((items) => setState({ status: "ready", items }))
      .catch((error: unknown) => {
        // An abort is the expected outcome of switching tags, not a failure.
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ status: "error", message: (error as Error).message });
      });
    /* eslint-enable react-hooks/set-state-in-effect */

    return () => controller.abort();
  }, [tag]);

  return <Panel testId="hand-rolled" state={state} />;
}

function WithQuery({ tag }: { tag: string }) {
  const query = useQuery({
    // The key is the cache. Two components with this key share one request, and
    // a tag you have already seen comes back without touching the network.
    queryKey: ["bookmarks", { tag }],
    queryFn: ({ signal }) => listBookmarks(tag, signal),
    // Without this, a revisit serves the cached rows instantly *and* fires a
    // background request to check them, because TanStack Query treats data as
    // stale the moment it arrives. That default is usually right. Here it would
    // hide the point, so the answer is trusted for thirty seconds. Lesson 02 is
    // about picking this number.
    staleTime: 30_000,
  });

  const state: Loaded = query.isPending
    ? { status: "loading" }
    : query.isError
      ? { status: "error", message: query.error.message }
      : { status: "ready", items: query.data };

  return <Panel testId="with-query" state={state} />;
}

function Panel({ testId, state }: { testId: string; state: Loaded }) {
  if (state.status === "loading") return <p data-testid={`${testId}-loading`}>loading…</p>;
  if (state.status === "error") return <p role="alert">{state.message}</p>;

  return (
    <ul data-testid={testId}>
      {state.items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}

const TAGS = ["react", "testing", "platform"];

export function FetchInAnEffect() {
  const [tag, setTag] = useState("react");

  return (
    <div className="stack">
      <div className="row">
        {TAGS.map((option) => (
          <button key={option} onClick={() => setTag(option)} aria-pressed={tag === option}>
            {option}
          </button>
        ))}
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <section>
          <h3>Fetch in an effect</h3>
          <HandRolled tag={tag} />
        </section>
        <section>
          <h3>useQuery</h3>
          <WithQuery tag={tag} />
        </section>
      </div>

      <p className="note">
        Open the network tab and click through the tags twice. The left panel requests every time.
        The right panel requests once per tag and then serves the rest from its cache, showing the
        old answer while it checks for a new one.
      </p>
    </div>
  );
}
