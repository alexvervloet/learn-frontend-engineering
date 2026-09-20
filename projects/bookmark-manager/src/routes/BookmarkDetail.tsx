import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ApiError } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { RouteHeading } from "../components/RouteHeading";
import { Button, Card, ErrorBanner, Spinner } from "../components/Ui";
import { useBookmark, useDeleteBookmark, useToggleFavorite } from "../hooks/useBookmarks";

export function BookmarkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const bookmarkId = Number(id);
  const bookmark = useBookmark(bookmarkId);
  const toggleFavorite = useToggleFavorite();
  const remove = useDeleteBookmark();

  if (bookmark.isPending) return <Spinner label="Loading…" />;

  if (bookmark.isError) {
    // A 404 is not "something went wrong". Telling them apart is the whole
    // reason the client throws an error carrying a status.
    const notFound = bookmark.error instanceof ApiError && bookmark.error.status === 404;

    return (
      <div className="space-y-4">
        <RouteHeading>{notFound ? "No such bookmark" : "Something went wrong"}</RouteHeading>
        <ErrorBanner
          title={notFound ? "That bookmark does not exist" : "Could not load it"}
          detail={bookmark.error instanceof Error ? bookmark.error.message : undefined}
        />
        <Link className="underline" to="/bookmarks">
          Back to the list
        </Link>
      </div>
    );
  }

  const item = bookmark.data;

  return (
    <div className="space-y-4">
      <RouteHeading>{item.title}</RouteHeading>

      <Card className="space-y-3">
        <p>
          <a className="underline" href={item.url} rel="noreferrer noopener" target="_blank">
            {item.url}
          </a>
        </p>
        {item.description !== null && <p>{item.description}</p>}

        <p className="text-sm text-[var(--text-muted)]" data-testid="clicks">
          {item.clickCount} clicks · added {new Date(item.createdAt).toLocaleDateString()}
        </p>

        {item.tags.length > 0 && (
          <p className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/bookmarks?tag=${encodeURIComponent(tag.name)}`}
                className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 underline"
              >
                {tag.name}
              </Link>
            ))}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            aria-pressed={item.favorite}
            onClick={() => toggleFavorite.mutate({ id: item.id, favorite: !item.favorite })}
          >
            {item.favorite ? "★ Favourited" : "☆ Favourite"}
          </Button>
          <Link
            to={`/bookmarks/${item.id}/edit`}
            className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-sm font-medium"
          >
            Edit
          </Link>
          <Button tone="danger" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>

        {remove.isError && (
          <ErrorBanner
            title="Could not delete it"
            detail={remove.error instanceof Error ? remove.error.message : undefined}
          />
        )}
      </Card>

      <ConfirmDialog
        open={confirming}
        title="Delete this bookmark?"
        body="This cannot be undone."
        confirmLabel="Delete"
        isPending={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          remove.mutate(item.id, {
            onSuccess: () => {
              setConfirming(false);
              void navigate("/bookmarks");
            },
            onError: () => setConfirming(false),
          });
        }}
      />
    </div>
  );
}
