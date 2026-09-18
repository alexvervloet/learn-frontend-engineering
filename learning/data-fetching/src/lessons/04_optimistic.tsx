/**
 * Optimistic updates and rollback
 * ===============================
 * A vote button that waits 300ms before the number moves feels broken. An
 * optimistic update writes the expected result into the cache immediately and
 * puts it back if the server disagrees.
 *
 * There are four steps and every one of them is load-bearing:
 *
 *   onMutate    cancel in-flight refetches for this key, snapshot the current
 *               data, write the expected data, return the snapshot
 *   onError     put the snapshot back
 *   onSettled   invalidate, so the server has the last word either way
 *   context     whatever onMutate returns is handed to onError and onSettled
 *
 * **`cancelQueries` is the step people skip.** Without it, a refetch that was
 * already in flight can land after your optimistic write and overwrite it with
 * the old number. The bug looks like the update "sometimes doesn't stick",
 * which is the worst kind to reproduce.
 *
 * **`onSettled` runs on success too, and should.** The optimistic value was a
 * guess: you added one to a count, but someone else may have voted in the same
 * second. Invalidating either way costs one request and means the screen ends
 * up agreeing with the server.
 *
 * Compare this with `useOptimistic` in react-core lesson 10. React's version is
 * less code and rolls back on its own, but the optimistic value lives for the
 * length of one action and is gone afterwards. This one writes into a shared
 * cache, so every component reading that key sees it, and it survives until
 * something invalidates it. Different tools. If the optimistic state belongs to
 * one form, use React's. If it belongs to data other components read, use this.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listBookmarks, voteFor } from "../api/client";
import { db, type Bookmark } from "../api/db";

const KEY = ["bookmarks", { tag: "" }];

export function Optimistic() {
  const queryClient = useQueryClient();

  const bookmarks = useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => listBookmarks("", signal),
    staleTime: 30_000,
  });

  const vote = useMutation({
    mutationFn: voteFor,

    onMutate: async (id: string) => {
      // A refetch already on its way would land after the write below and undo
      // it. This is the step that makes the update stick.
      await queryClient.cancelQueries({ queryKey: KEY });

      const previous = queryClient.getQueryData<Bookmark[]>(KEY);
      queryClient.setQueryData<Bookmark[]>(KEY, (current) =>
        current?.map((item) => (item.id === id ? { ...item, votes: item.votes + 1 } : item)),
      );

      // Handed to onError and onSettled as `context`.
      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(KEY, context.previous);
    },

    onSettled: () => {
      // Even on success. The guess was "+1", and the server knows the real number.
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });

  if (bookmarks.isPending) return <p>loading…</p>;
  if (bookmarks.isError) return <p role="alert">{bookmarks.error.message}</p>;

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => db.failNextWrite(true)}>Make the next vote fail</button>
        {vote.isError && <span style={{ color: "var(--danger)" }}>rolled back</span>}
      </div>

      <ul data-testid="list">
        {bookmarks.data.map((item) => (
          <li key={item.id} className="row">
            <button onClick={() => vote.mutate(item.id)} aria-label={`vote for ${item.title}`}>
              ▲
            </button>
            <span data-testid={`votes-${item.id}`}>{item.votes}</span>
            <span>{item.title}</span>
          </li>
        ))}
      </ul>

      <p className="note">
        Vote: the number moves before the request finishes. Press “Make the next vote fail”, then
        vote: the number moves, then goes back. No rollback code beyond one line in onError.
      </p>
    </div>
  );
}
