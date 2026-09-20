import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  createBookmark,
  deleteBookmark,
  getBookmark,
  listBookmarks,
  listTags,
  updateBookmark,
  type BookmarkInput,
} from "../api/client";
import { PAGE_SIZE, type Bookmark, type BookmarkFilters } from "../api/types";

/**
 * Query keys in one place, built by a function.
 *
 * Two reasons this is not over-engineering. Every input the query function
 * reads has to be in the key, and a function makes that mechanical. And
 * invalidation matches by prefix, so `["bookmarks"]` invalidates every filter
 * and page at once without anyone enumerating them.
 */
export const keys = {
  all: ["bookmarks"] as const,
  list: (filters: BookmarkFilters) => ["bookmarks", "list", filters] as const,
  detail: (id: number) => ["bookmarks", "detail", id] as const,
  tags: ["tags"] as const,
};

export function useBookmarks(filters: BookmarkFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: ({ signal }) =>
      listBookmarks({
        tag: filters.tag,
        favorite: filters.favorite,
        offset: (filters.page - 1) * PAGE_SIZE,
        // One more than a page, so the client can tell whether a next page
        // exists. The API returns a bare array with no total, and inventing
        // one in the mock would teach a client that will not work.
        limit: PAGE_SIZE + 1,
        signal,
      }),
    // The list is read far more often than it changes, and a stale list for
    // half a minute is not a problem worth a request per navigation.
    staleTime: 30_000,
    select: (rows) => ({ items: rows.slice(0, PAGE_SIZE), hasNextPage: rows.length > PAGE_SIZE }),
  });
}

export function useBookmark(id: number) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: ({ signal }) => getBookmark(id, signal),
    staleTime: 30_000,
  });
}

export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: ({ signal }) => listTags(signal),
    // Tags change when a bookmark is created, and rarely otherwise.
    staleTime: 5 * 60_000,
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BookmarkInput) => createBookmark(input),
    onSuccess: () => {
      // Prefix match: every list and every page. Creating a bookmark can also
      // create a tag, so that list goes too.
      void queryClient.invalidateQueries({ queryKey: keys.all });
      void queryClient.invalidateQueries({ queryKey: keys.tags });
    },
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteBookmark(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}

/**
 * Every cached list, so an optimistic write can touch all of them.
 *
 * The type here is `Bookmark[]`, not the `{ items, hasNextPage }` that
 * `useBookmarks` returns. `select` transforms on *read*: the cache holds what
 * the query function returned. Writing the selected shape back into the cache
 * puts an object where an array belongs, and the symptom is an optimistic
 * update that appears to do nothing at all.
 */
function listEntries(queryClient: QueryClient) {
  return queryClient.getQueriesData<Bookmark[]>({ queryKey: ["bookmarks", "list"] });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      updateBookmark(id, { favorite }),

    onMutate: async ({ id, favorite }) => {
      // A refetch already in flight would land after the write below and undo
      // it. Skipping this is why an optimistic update "sometimes does not
      // stick", which is the worst kind of bug to reproduce.
      await queryClient.cancelQueries({ queryKey: keys.all });

      const previous = listEntries(queryClient);
      const previousDetail = queryClient.getQueryData<Bookmark>(keys.detail(id));

      for (const [key, value] of previous) {
        if (value === undefined) continue;
        queryClient.setQueryData(
          key,
          value.map((item) => (item.id === id ? { ...item, favorite } : item)),
        );
      }
      if (previousDetail !== undefined) {
        queryClient.setQueryData(keys.detail(id), { ...previousDetail, favorite });
      }

      return { previous, previousDetail, id };
    },

    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.previous ?? []) {
        queryClient.setQueryData(key, value);
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(keys.detail(context.id), context.previousDetail);
      }
    },

    onSettled: () => {
      // On success too: the optimistic value was a guess, and the server has
      // the last word.
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}
