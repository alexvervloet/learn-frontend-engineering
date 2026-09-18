/**
 * Mutations and invalidation
 * ==========================
 * A query reads. A mutation writes, and then has to tell the cache what it just
 * made wrong.
 *
 *   const { mutate, isPending, error } = useMutation({
 *     mutationFn: createBookmark,
 *     onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
 *   });
 *
 * `invalidateQueries` marks matching entries stale and refetches the ones
 * currently on screen. Matching is by prefix, so `["bookmarks"]` hits
 * `["bookmarks", { tag: "react" }]` and every other tag with it. That prefix
 * rule is the reason to give keys a hierarchy: put the noun first and the
 * parameters after it, and invalidating a whole area of the app is one call.
 *
 * The alternative is `setQueryData`, writing the server's response straight into
 * the cache with no refetch. It saves a round trip and it is a promise that your
 * client-side idea of the new list matches the server's. Use it when the
 * response contains the whole updated resource. Use `invalidateQueries` when
 * anything else might have changed too, which is most of the time.
 *
 * Two smaller things the demo shows.
 *
 * **`mutate` versus `mutateAsync`.** `mutate` does not return a promise and
 * cannot reject; errors go to `onError` and to the hook's `error`. `mutateAsync`
 * rejects, so it needs a `try`/`catch` or you get an unhandled rejection.
 * Prefer `mutate` unless you specifically need to await the result.
 *
 * **Validation errors are not failures of the request.** The API returns 422
 * with a message for an empty title. The client throws an ApiError carrying the
 * status, so the component can show that message rather than "something went
 * wrong".
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

import { createBookmark, listBookmarks } from "../api/client";

export function Mutations() {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);

  const bookmarks = useQuery({
    queryKey: ["bookmarks", { tag: "" }],
    queryFn: ({ signal }) => listBookmarks("", signal),
    staleTime: 30_000,
  });

  const add = useMutation({
    mutationFn: createBookmark,
    onSuccess: () => {
      // Prefix match: every ["bookmarks", …] entry is now stale.
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      formRef.current?.reset();
    },
  });

  return (
    <div className="stack">
      <form
        ref={formRef}
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          add.mutate({
            title: String(data.get("title") ?? ""),
            url: String(data.get("url") ?? "https://example.com"),
            tag: "react",
          });
        }}
      >
        <input name="title" aria-label="Title" placeholder="a title" />
        <button type="submit" disabled={add.isPending}>
          {add.isPending ? "Saving…" : "Add"}
        </button>
      </form>

      {add.isError && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {add.error.message}
        </p>
      )}

      {bookmarks.isPending ? (
        <p>loading…</p>
      ) : (
        <ul data-testid="list">
          {(bookmarks.data ?? []).map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}

      <p className="note">
        Submit with the title empty: the API answers 422 and the message it sends is what appears,
        not a generic error. Add a real one and the list refetches itself.
      </p>
    </div>
  );
}
