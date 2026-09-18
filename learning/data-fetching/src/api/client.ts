import type { Bookmark } from "./db";

/**
 * The fetch layer. Three things it does that a bare `fetch` call does not, and
 * all three matter more than they look.
 *
 * `fetch` does not reject on a 404 or a 500. It resolves with `ok: false`, so
 * code that only catches rejections treats an error page as data. Throwing here
 * is what lets TanStack Query see a failure at all.
 *
 * The thrown error carries the status, so a caller can tell "retry this" from
 * "this will never work".
 *
 * And the signal is threaded through, so a cancelled query actually cancels the
 * request rather than just ignoring the answer.
 */
export class ApiError extends Error {
  // Written out rather than as a `readonly status: number` constructor
  // parameter. Parameter properties emit real code, so `erasableSyntaxOnly` in
  // the shared tsconfig rejects them: the rule is that stripping the types has
  // to leave working JavaScript, which is what Node and every modern bundler
  // now do instead of compiling.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(body.message ?? response.statusText, response.status);
  }

  return (await response.json()) as T;
}

export function listBookmarks(tag: string | null, signal?: AbortSignal): Promise<Bookmark[]> {
  const query = tag === null || tag === "" ? "" : `?tag=${encodeURIComponent(tag)}`;
  return request<Bookmark[]>(`/api/bookmarks${query}`, { signal });
}

export type Page = { items: Bookmark[]; nextCursor: number | null };

export function listPage(cursor: number, signal?: AbortSignal): Promise<Page> {
  return request<Page>(`/api/bookmarks?cursor=${cursor}`, { signal });
}

export function createBookmark(input: {
  title: string;
  url: string;
  tag: string;
}): Promise<Bookmark> {
  return request<Bookmark>("/api/bookmarks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function voteFor(id: string): Promise<Bookmark> {
  return request<Bookmark>(`/api/bookmarks/${id}/vote`, { method: "POST" });
}
