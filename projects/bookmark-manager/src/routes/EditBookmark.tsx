import { useNavigate, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateBookmark } from "../api/client";
import { BookmarkForm } from "../components/BookmarkForm";
import { RouteHeading } from "../components/RouteHeading";
import { Card, ErrorBanner, Spinner } from "../components/Ui";
import { keys, useBookmark } from "../hooks/useBookmarks";

export function EditBookmark() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const bookmarkId = Number(id);
  const bookmark = useBookmark(bookmarkId);

  const save = useMutation({
    mutationFn: (patch: { title: string; url: string; description: string | null }) =>
      updateBookmark(bookmarkId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });

  if (bookmark.isPending) return <Spinner label="Loading…" />;
  if (bookmark.isError) return <ErrorBanner title="Could not load that bookmark" />;

  const item = bookmark.data;

  return (
    <div className="space-y-4">
      <RouteHeading>Edit</RouteHeading>

      <Card>
        {/*
          `key` on the form, so changing which bookmark is being edited
          remounts it with the new defaults. `defaultValues` is read once, on
          the first render, and changing it later does nothing: that is the
          "my form does not update when the data loads" bug.
        */}
        <BookmarkForm
          key={item.id}
          submitLabel="Save"
          isSubmitting={save.isPending}
          serverError={save.isError ? (save.error as Error).message : null}
          defaultValues={{
            title: item.title,
            url: item.url,
            description: item.description ?? "",
            tags: item.tags.map((tag) => tag.name).join(", "),
          }}
          onSubmit={(values) => {
            save.mutate(
              { title: values.title, url: values.url, description: values.description },
              { onSuccess: () => void navigate(`/bookmarks/${item.id}`) },
            );
          }}
        />
      </Card>
    </div>
  );
}
