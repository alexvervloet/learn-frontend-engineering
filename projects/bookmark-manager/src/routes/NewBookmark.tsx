import { useNavigate } from "react-router";

import { BookmarkForm } from "../components/BookmarkForm";
import { RouteHeading } from "../components/RouteHeading";
import { Card } from "../components/Ui";
import { useCreateBookmark } from "../hooks/useBookmarks";

export function NewBookmark() {
  const navigate = useNavigate();
  const create = useCreateBookmark();

  return (
    <div className="space-y-4">
      <RouteHeading>Add a bookmark</RouteHeading>

      <Card>
        <BookmarkForm
          submitLabel="Add it"
          isSubmitting={create.isPending}
          serverError={create.isError ? (create.error as Error).message : null}
          onSubmit={(values) => {
            create.mutate(values, {
              onSuccess: (created) => {
                void navigate(`/bookmarks/${created.id}`);
              },
            });
          }}
        />
      </Card>
    </div>
  );
}
