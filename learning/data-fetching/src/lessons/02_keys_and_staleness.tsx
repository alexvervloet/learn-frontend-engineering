/**
 * Query keys, staleTime, and gcTime
 * =================================
 * **The key is the cache.** `["bookmarks", { tag: "react" }]` is the address of
 * one answer. Two components asking for that key get one request between them,
 * and anything that changes the answer has to name the key to invalidate it.
 *
 * So: every input the query function reads goes in the key. A key that leaves
 * out `tag` returns the wrong tag's rows. This is the same rule as an effect's
 * dependency array, for the same reason.
 *
 * **staleTime and gcTime are different clocks**, and mixing them up is the usual
 * confusion:
 *
 *   staleTime   how long the answer is trusted. Within it, a revisit renders
 *               from cache and makes no request. After it, the cached answer is
 *               still shown immediately and a request goes out behind it.
 *               Default 0
 *   gcTime      how long an answer nobody is using stays in memory before being
 *               thrown away. It only starts counting when the last component
 *               using it unmounts. Default 5 minutes
 *
 * `staleTime: 0` does not mean "no cache". It means "always revalidate". You
 * still get the instant render; you also get a request.
 *
 * Picking staleTime is a product question, not a technical one. How wrong is it
 * acceptable for this to be? A list of countries: an hour. A stock price: zero.
 * Most application data sits at thirty seconds to a few minutes, and the
 * default of zero is the conservative choice rather than the right one.
 *
 * The demo has two sibling components on the same key. They render separately
 * and share one request, which is the thing that removes most of the "lift the
 * fetch up to a common parent" work from an app.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { listBookmarks } from "../api/client";

function useBookmarks(tag: string, staleTime: number) {
  return useQuery({
    queryKey: ["bookmarks", { tag }],
    queryFn: ({ signal }) => listBookmarks(tag, signal),
    staleTime,
  });
}

/** Renders the count. Same key as the sibling below. */
function Summary({ tag, staleTime }: { tag: string; staleTime: number }) {
  // Not destructured. TanStack Query's result is a union discriminated on
  // `status`, and pulling `data` out of it separately loses the narrowing that
  // makes `data` non-optional once `isPending` is false.
  const query = useBookmarks(tag, staleTime);

  return (
    <p data-testid="summary">
      {query.isPending ? "counting…" : `${query.data?.length ?? 0} bookmarks tagged ${tag}`}
      {/* isFetching is true for a background refetch too, when data is already
          on screen. isPending is true only when there is nothing to show. */}
      {query.isFetching && !query.isPending && <span className="note"> · refreshing</span>}
    </p>
  );
}

/** Renders the list. Same key again, so no second request. */
function List({ tag, staleTime }: { tag: string; staleTime: number }) {
  const query = useBookmarks(tag, staleTime);
  if (query.isPending) return <p>loading…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;

  return (
    <ul data-testid="list">
      {query.data.map((item) => (
        <li key={item.id}>
          {item.title} <span className="note">({item.votes})</span>
        </li>
      ))}
    </ul>
  );
}

const TAGS = ["react", "testing", "platform"];

export function KeysAndStaleness() {
  const [tag, setTag] = useState("react");
  const [staleTime, setStaleTime] = useState(30_000);

  return (
    <div className="stack">
      <div className="row">
        {TAGS.map((option) => (
          <button key={option} onClick={() => setTag(option)} aria-pressed={tag === option}>
            {option}
          </button>
        ))}
      </div>

      <label className="row">
        staleTime
        <select
          value={staleTime}
          onChange={(event) => setStaleTime(Number(event.target.value))}
          aria-label="staleTime"
        >
          <option value={0}>0 (always revalidate)</option>
          <option value={30_000}>30 seconds</option>
          <option value={Infinity}>Infinity (never refetch)</option>
        </select>
      </label>

      <Summary tag={tag} staleTime={staleTime} />
      <List tag={tag} staleTime={staleTime} />

      <p className="note">
        Two components, one request. Switch tags back and forth with the network tab open: at 30
        seconds a revisit is silent, at 0 every revisit refetches in the background while showing
        the cached rows.
      </p>
    </div>
  );
}
