import {
  toBookmark,
  type Bookmark,
  type BookmarkWire,
  type TagWire,
  type TokenWire,
  type UserWire,
} from "./types";

/**
 * The fetch layer, and the only place in the app that knows the wire format.
 *
 * Four things it does that a bare `fetch` does not, and each one is a bug
 * avoided rather than a nicety.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const BASE = import.meta.env["VITE_API_URL"] ?? "/api";

/**
 * The access token lives in a module variable, not in localStorage.
 *
 * Any script on the origin can read localStorage, including one injected by
 * XSS or shipped inside a dependency. A token in memory is gone on reload,
 * which is the trade: a real deployment pairs this with a refresh token in an
 * HttpOnly cookie. See the production module's auth lesson.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (accessToken !== null) headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${BASE}${path}`, { ...init, headers });

  // `fetch` does not reject on a 404 or a 500: it resolves with ok:false, so
  // code that only catches rejections treats an error page as data. Throwing
  // is what lets TanStack Query see a failure at all.
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new ApiError(body.detail ?? response.statusText, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export type ListParams = {
  tag: string | null;
  favorite: boolean | null;
  offset: number;
  limit: number;
  signal?: AbortSignal;
};

export async function listBookmarks(params: ListParams): Promise<Bookmark[]> {
  const query = new URLSearchParams();
  if (params.tag !== null) query.set("tag", params.tag);
  if (params.favorite !== null) query.set("favorite", String(params.favorite));
  query.set("offset", String(params.offset));
  query.set("limit", String(params.limit));

  const wire = await request<BookmarkWire[]>(`/bookmarks?${query.toString()}`, {
    // Threaded through, so a cancelled query cancels the request rather than
    // ignoring the answer.
    ...(params.signal === undefined ? {} : { signal: params.signal }),
  });

  return wire.map(toBookmark);
}

export async function getBookmark(id: number, signal?: AbortSignal): Promise<Bookmark> {
  const wire = await request<BookmarkWire>(`/bookmarks/${id}`, {
    ...(signal === undefined ? {} : { signal }),
  });
  return toBookmark(wire);
}

export type BookmarkInput = {
  url: string;
  title: string;
  description: string | null;
  tags: string[];
};

export async function createBookmark(input: BookmarkInput): Promise<Bookmark> {
  const wire = await request<BookmarkWire>("/bookmarks", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return toBookmark(wire);
}

export async function updateBookmark(
  id: number,
  patch: Partial<{ title: string; url: string; description: string | null; favorite: boolean }>,
): Promise<Bookmark> {
  const wire = await request<BookmarkWire>(`/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return toBookmark(wire);
}

export async function deleteBookmark(id: number): Promise<void> {
  await request<void>(`/bookmarks/${id}`, { method: "DELETE" });
}

export async function listTags(signal?: AbortSignal): Promise<string[]> {
  const wire = await request<TagWire[]>("/tags", {
    ...(signal === undefined ? {} : { signal }),
  });
  return wire.map((tag) => tag.name);
}

export async function logIn(username: string, password: string): Promise<string> {
  const wire = await request<TokenWire>("/auth/token", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return wire.access_token;
}

export async function getMe(signal?: AbortSignal): Promise<UserWire> {
  return request<UserWire>("/auth/me", {
    ...(signal === undefined ? {} : { signal }),
  });
}
