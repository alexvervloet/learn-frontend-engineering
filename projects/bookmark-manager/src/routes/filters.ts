import type { BookmarkFilters } from "../api/types";

/**
 * Reading and writing the filter state, which lives in the URL.
 *
 * Its own file, not the route component's, for two reasons. Fast Refresh can
 * only swap a module that exports components and nothing else, so a helper
 * alongside a route turns every edit into a full page reload. And these are
 * pure functions worth testing without rendering anything.
 *
 * Why the URL at all: the link is shareable, a reload keeps your place, Back
 * means back, and the server could read it. A `useState` copy is two sources
 * of truth that disagree the moment someone presses Back. See
 * learning/routing.
 */
export function readFilters(params: URLSearchParams): BookmarkFilters {
  const favorite = params.get("favorite");

  return {
    tag: params.get("tag"),
    favorite: favorite === null ? null : favorite === "true",
    // A hand-edited URL, a stale bookmark, a bad link in an email: repaired
    // here, once, rather than guessed at by every component downstream.
    page: Math.max(1, Number(params.get("page") ?? "1") || 1),
  };
}

/** Defaults are absent, not spelled out: two URLs should not render one page. */
export function writeFilters(
  current: URLSearchParams,
  changes: Partial<BookmarkFilters>,
): URLSearchParams {
  const next = new URLSearchParams(current);

  if ("tag" in changes) {
    if (changes.tag == null) next.delete("tag");
    else next.set("tag", changes.tag);
    // Changing the filter invalidates the page number. Forgetting this is
    // the "no results on page 3" bug.
    next.delete("page");
  }

  if ("favorite" in changes) {
    if (changes.favorite == null) next.delete("favorite");
    else next.set("favorite", String(changes.favorite));
    next.delete("page");
  }

  if (changes.page !== undefined) {
    if (changes.page <= 1) next.delete("page");
    else next.set("page", String(changes.page));
  }

  return next;
}
