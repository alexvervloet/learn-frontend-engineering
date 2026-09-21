/**
 * SWR, and what a smaller library leaves out
 * ==========================================
 * SWR is named after the HTTP directive it implements:
 * `Cache-Control: stale-while-revalidate`. Serve the cached answer
 * immediately, revalidate behind it, re-render when the fresh one lands.
 * TanStack Query does the same thing; the difference is everything around it.
 *
 *   const { data, error, isLoading } = useSWR("/api/bookmarks", fetcher);
 *
 * That is the whole API for reading. No provider, no client instance, no query
 * key array: the key is the string, and the fetcher is a function you pass or
 * configure globally. For a component that reads one endpoint, there is less
 * to hold in your head, and that is a real advantage rather than a marketing
 * one.
 *
 * **What is the same.** A cache keyed by the key. Deduplication, so three
 * components asking for one key make one request. Revalidation on focus and on
 * reconnect. Stale data on screen while the refetch runs. Both libraries got
 * these right and you should expect them from anything in this category.
 *
 * **What SWR leaves out, and when you notice.**
 *
 *   mutations      `useSWRMutation` exists but is thin. There is no
 *                  onMutate/onError/onSettled lifecycle, so an optimistic
 *                  update with rollback is something you write, not something
 *                  you configure. Lesson 04's twenty lines become forty.
 *   invalidation   `mutate` takes a key or a filter function. There is no
 *                  prefix matching on a structured key, because keys are
 *                  strings rather than arrays. `["bookmarks", { tag }]`
 *                  invalidating every tag at once is a TanStack Query idea.
 *   devtools       nothing comparable. The Query devtools panel showing every
 *                  entry, its staleness and its observers is most of how you
 *                  debug a cache, and going without is the change you feel
 *                  first.
 *   infinite       `useSWRInfinite` exists and is page-index based rather than
 *                  cursor based, which fits an offset API and fights a cursor
 *                  one.
 *
 * **What SWR has that Query does not.** It is about a third of the bundle, it
 * needs no provider at the root, and `useSWRSubscription` is a genuinely nice
 * primitive for a stream, which lesson 07 uses.
 *
 * **The honest recommendation.** If the app mostly reads, SWR is less
 * machinery for the same result. The moment there are mutations that have to
 * invalidate related things, or optimistic updates with rollback, the pieces
 * you write by hand add up to a worse version of what Query already ships.
 * Most apps end up in the second category, which is why this repo teaches
 * Query first.
 *
 * Both panels below hit the same MSW handler and count their requests, so the
 * dedup claim is a number on screen rather than an assertion in prose.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import useSWR, { SWRConfig, useSWRConfig } from "swr";

import { listBookmarks } from "../api/client";
import type { Bookmark } from "../api/db";

/** One fetcher for every key, the usual SWR arrangement. */
async function fetcher(key: string): Promise<Bookmark[]> {
  // The key *is* the URL here. It does not have to be, but making it the URL
  // is what lets one global fetcher serve every hook: the fetcher can read
  // everything it needs out of the key it was handed.
  const tag = new URL(key, "http://localhost").searchParams.get("tag");
  return listBookmarks(tag);
}

const KEY = "/api/bookmarks";

function SwrPanel({ label }: { label: string }) {
  const { data, error, isLoading, isValidating } = useSWR<Bookmark[]>(KEY, fetcher);

  return (
    <div className="stack" data-testid={`swr-${label}`}>
      <strong>{label}</strong>
      {isLoading && <p data-testid={`swr-${label}-loading`}>loading…</p>}
      {error !== undefined && <p role="alert">something went wrong</p>}
      <ul>
        {(data ?? []).map((bookmark) => (
          <li key={bookmark.id}>{bookmark.title}</li>
        ))}
      </ul>
      {/* isValidating is true for a background refetch with data already on
          screen. It is the flag that lets you show "updating" without
          flashing a spinner over content the user is reading. */}
      <p className="note" data-testid={`swr-${label}-validating`}>
        {isValidating ? "revalidating" : "idle"}
      </p>
    </div>
  );
}

function QueryPanel() {
  const { data, isPending, isFetching } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks", null],
    queryFn: () => listBookmarks(null),
  });

  return (
    <div className="stack" data-testid="query-panel">
      <strong>TanStack Query</strong>
      {isPending && <p>loading…</p>}
      <ul>
        {(data ?? []).map((bookmark) => (
          <li key={bookmark.id}>{bookmark.title}</li>
        ))}
      </ul>
      <p className="note">{isFetching ? "fetching" : "idle"}</p>
    </div>
  );
}

/**
 * `mutate` without a key updates by filter. With a key it updates one entry.
 *
 * This is the shape of SWR's invalidation, and the limit is visible in it:
 * the filter gets the key, which is a string, so "everything under
 * bookmarks" is a `startsWith` you write rather than a prefix match the
 * library understands.
 */
export function keysToRevalidate(keys: readonly string[], prefix: string): string[] {
  return keys.filter((key) => typeof key === "string" && key.startsWith(prefix));
}

function RevalidateButton() {
  const { mutate } = useSWRConfig();
  const [count, setCount] = useState(0);

  return (
    <button
      type="button"
      data-testid="revalidate"
      onClick={() => {
        // A filter function, because there is no structured key to match a
        // prefix against. With array keys this would be
        // `invalidateQueries({ queryKey: ["bookmarks"] })`.
        void mutate((key) => typeof key === "string" && key.startsWith("/api/bookmarks"));
        setCount((current) => current + 1);
      }}
    >
      Revalidate every bookmarks key ({count})
    </button>
  );
}

export function SwrLesson() {
  return (
    <div className="stack">
      <p className="note">
        Two SWR panels with the same key, and a Query panel beside them. Watch the network tab: the
        two SWR panels make one request between them, because the key is the identity and SWR
        deduplicates.
      </p>

      {/*
        A provider is optional in SWR, unlike Query. It is here to give the
        lesson its own cache rather than sharing the module-level default with
        every other lesson in the sidebar, which is the same reason the tests
        build a fresh QueryClient each time.
      */}
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
        <div className="row" style={{ alignItems: "flex-start", gap: "2rem" }}>
          <SwrPanel label="a" />
          <SwrPanel label="b" />
        </div>
        <RevalidateButton />
      </SWRConfig>

      <hr />
      <QueryPanel />

      <p className="note">
        The same data, the same handler, and about a third of the bundle. What is missing is
        everything lesson 03 and lesson 04 were about.
      </p>
    </div>
  );
}
