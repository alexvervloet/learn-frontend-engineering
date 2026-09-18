/**
 * Infinite lists
 * ==============
 * `useInfiniteQuery` keeps pages rather than a single answer. The cache entry is
 * `{ pages: [...], pageParams: [...] }`, which is why it needs its own hook
 * rather than a flag on `useQuery`.
 *
 *   initialPageParam    where to start
 *   getNextPageParam    given the last page, what to ask for next. Return
 *                       undefined or null to say "that was the end"
 *
 * `hasNextPage` is derived from `getNextPageParam`, so the end of the list is
 * something the server tells you rather than something the client counts. Offset
 * arithmetic on the client is how you end up with a "Load more" button that
 * never goes away.
 *
 * **Cursors beat offsets** for anything that can change while someone is
 * reading. With `?offset=20`, an item inserted at the top while the user sits on
 * page one pushes everything down, so page two repeats the row that was at the
 * bottom of page one. A cursor pointing at a record does not move. The fake API
 * here uses an offset because it is easier to read, and a real one should not.
 *
 * Two things worth knowing before shipping one:
 *
 * **Refetching refetches every page.** By default an invalidated infinite query
 * re-requests all the pages it is holding, in order, because pages after the
 * first depend on the ones before. Ten pages is ten requests. `maxPages` caps
 * what is retained.
 *
 * **A long list needs virtualization, not just paging.** Twenty pages of fifty
 * rows is a thousand DOM nodes, and scrolling gets worse with every "Load more".
 * The performance module covers TanStack Virtual, which is the other half of
 * this.
 */
import { useInfiniteQuery } from "@tanstack/react-query";

import { listPage } from "../api/client";

export function Infinite() {
  const query = useInfiniteQuery({
    queryKey: ["bookmarks", "pages"],
    queryFn: ({ pageParam, signal }) => listPage(pageParam, signal),
    initialPageParam: 0,
    // The server said what comes next, or that nothing does.
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });

  if (query.isPending) return <p>loading…</p>;
  if (query.isError) return <p role="alert">{query.error.message}</p>;

  const items = query.data.pages.flatMap((page) => page.items);

  return (
    <div className="stack">
      <ul data-testid="list">
        {items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>

      <div className="row">
        <button
          onClick={() => void query.fetchNextPage()}
          disabled={!query.hasNextPage || query.isFetchingNextPage}
        >
          {query.isFetchingNextPage
            ? "Loading…"
            : query.hasNextPage
              ? "Load more"
              : "That is all of them"}
        </button>
        <span className="note" data-testid="count">
          {items.length} of {query.data.pages[0]?.items.length ?? 0} per page
        </span>
      </div>

      <p className="note">
        The button disables itself because <code>getNextPageParam</code> returned null, not because
        the component counted rows.
      </p>
    </div>
  );
}
