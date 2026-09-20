import { Link, useSearchParams } from "react-router";

import { PAGE_SIZE } from "../api/types";
import { RouteHeading } from "../components/RouteHeading";
import { cx } from "../components/cx";
import { Button, Card, EmptyState, ErrorBanner, Spinner, StatusRegion } from "../components/Ui";
import { useBookmarks, useTags, useToggleFavorite } from "../hooks/useBookmarks";
import { readFilters, writeFilters } from "./filters";

export function BookmarkList() {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);

  const bookmarks = useBookmarks(filters);
  const tags = useTags();
  const toggleFavorite = useToggleFavorite();

  const items = bookmarks.data?.items ?? [];

  return (
    <div className="space-y-4">
      <RouteHeading>Bookmarks</RouteHeading>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Tag</span>
          <Button
            onClick={() => setParams(writeFilters(params, { tag: null }))}
            aria-pressed={filters.tag === null}
            className={cx(filters.tag === null && "border-brand-500 text-brand-500")}
          >
            all
          </Button>
          {(tags.data ?? []).map((tag) => (
            <Button
              key={tag}
              onClick={() => setParams(writeFilters(params, { tag }))}
              aria-pressed={filters.tag === tag}
              className={cx(filters.tag === tag && "border-brand-500 text-brand-500")}
            >
              {tag}
            </Button>
          ))}

          <label className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.favorite === true}
              onChange={(event) =>
                setParams(writeFilters(params, { favorite: event.target.checked ? true : null }))
              }
            />
            Favourites only
          </label>
        </div>
      </Card>

      {/* Present from the first render, empty. A region that appears with its
          content is often not announced at all. */}
      <StatusRegion
        message={
          bookmarks.isPending
            ? null
            : `${items.length} bookmark${items.length === 1 ? "" : "s"}${
                filters.tag === null ? "" : ` tagged ${filters.tag}`
              }`
        }
      />

      {bookmarks.isPending && <Spinner label="Loading bookmarks…" />}

      {bookmarks.isError && (
        <ErrorBanner
          title="Could not load your bookmarks"
          detail={bookmarks.error instanceof Error ? bookmarks.error.message : undefined}
        />
      )}

      {!bookmarks.isPending && !bookmarks.isError && items.length === 0 && (
        <EmptyState title="Nothing here">
          {filters.tag === null && filters.favorite === null ? (
            <Link className="underline" to="/bookmarks/new">
              Add your first bookmark
            </Link>
          ) : (
            <Button onClick={() => setParams(writeFilters(params, { tag: null, favorite: null }))}>
              Clear the filters
            </Button>
          )}
        </EmptyState>
      )}

      {items.length > 0 && (
        <ul className="space-y-3" data-testid="bookmarks">
          {items.map((bookmark) => (
            <li key={bookmark.id}>
              <Card className="flex items-start gap-3">
                <Button
                  aria-pressed={bookmark.favorite}
                  aria-label={`${bookmark.favorite ? "Unfavourite" : "Favourite"} ${bookmark.title}`}
                  onClick={() =>
                    toggleFavorite.mutate({ id: bookmark.id, favorite: !bookmark.favorite })
                  }
                >
                  {bookmark.favorite ? "★" : "☆"}
                </Button>

                <div className="min-w-0 flex-1">
                  <Link className="font-medium underline" to={`/bookmarks/${bookmark.id}`}>
                    {bookmark.title}
                  </Link>
                  <p className="truncate text-sm text-[var(--text-muted)]">{bookmark.url}</p>
                  {bookmark.tags.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-1">
                      {bookmark.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Pagination" className="flex items-center gap-3">
        <Button
          onClick={() => setParams(writeFilters(params, { page: filters.page - 1 }))}
          disabled={filters.page <= 1}
        >
          Previous
        </Button>
        <span className="text-sm text-[var(--text-muted)]" data-testid="page">
          Page {filters.page}
        </span>
        <Button
          onClick={() => setParams(writeFilters(params, { page: filters.page + 1 }))}
          disabled={bookmarks.data?.hasNextPage !== true}
        >
          Next
        </Button>
        <span className="text-sm text-[var(--text-muted)]">{PAGE_SIZE} per page</span>
      </nav>
    </div>
  );
}
