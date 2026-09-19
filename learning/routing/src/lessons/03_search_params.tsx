/**
 * The URL is state you already have
 * =================================
 * A filter, a sort order, a page number, an open tab, a search query: all of it
 * belongs in the URL. Put it in `useState` and four things stop working, none
 * of which anyone asks for explicitly and all of which users expect:
 *
 *   the link is shareable         someone can send you the filtered view
 *   reload keeps your place       and so does restoring a closed tab
 *   back means back               not "leave the page entirely"
 *   the server can read it        for SSR, or an analytics event with context
 *
 * `useSearchParams` is `useState` for the query string:
 *
 *   const [params, setParams] = useSearchParams();
 *   const tag = params.get("tag") ?? "";
 *
 * **Derive, never duplicate.** `const [tag, setTag] = useState(params.get("tag"))`
 * gives two sources of truth that disagree the moment someone presses Back: the
 * URL changes, the state does not. Read straight from `params` on every render
 * instead. It is already the state.
 *
 * **`replace: true` for anything the user is adjusting.** Typing five
 * characters into a search box with push semantics puts five entries in the
 * history, so Back deletes one character at a time and it takes five presses to
 * leave. Replace for a filter being tuned; push for a navigation the user would
 * expect to undo.
 *
 * **Leave defaults out.** `?tag=&sort=newest&page=1` when everything is at its
 * default is noise in a shared link, and it means two URLs render the same
 * page, which is bad for caching and for analytics. Write a param only when it
 * differs from the default.
 *
 * **URLSearchParams is not a plain object.** It handles repeats
 * (`?tag=a&tag=b`, read with `getAll`) and encodes for you. Do not build query
 * strings with template literals; a `&` in someone's search term will break it.
 *
 * The one thing to keep in `useState` is state nobody would want to link to:
 * whether a dropdown is open, an unsent draft, a hover.
 */
import { RouterProvider, createMemoryRouter, useSearchParams } from "react-router";

import { TAGS } from "../data";

const SORTS = ["newest", "oldest"] as const;
type Sort = (typeof SORTS)[number];

const DEFAULT_SORT: Sort = "newest";

/** Exported for the test: the rule about which params get written. */
export function nextParams(
  current: URLSearchParams,
  changes: { tag?: string; sort?: Sort; page?: number },
): URLSearchParams {
  const next = new URLSearchParams(current);

  if (changes.tag !== undefined) {
    // A default is an absent param, not an empty one.
    if (changes.tag === "") next.delete("tag");
    else next.set("tag", changes.tag);
    // Changing the filter invalidates the page number. Forgetting this is the
    // "no results on page 3" bug.
    next.delete("page");
  }

  if (changes.sort !== undefined) {
    if (changes.sort === DEFAULT_SORT) next.delete("sort");
    else next.set("sort", changes.sort);
  }

  if (changes.page !== undefined) {
    if (changes.page <= 1) next.delete("page");
    else next.set("page", String(changes.page));
  }

  return next;
}

function Filters() {
  const [params, setParams] = useSearchParams();

  // Read from the URL on every render. No copy in state, so Back works.
  const tag = params.get("tag") ?? "";
  const sort = (params.get("sort") as Sort | null) ?? DEFAULT_SORT;
  const page = Number(params.get("page") ?? "1");
  const query = params.get("q") ?? "";

  return (
    <div className="stack">
      <div className="row">
        <span>tag:</span>
        <button
          onClick={() => setParams(nextParams(params, { tag: "" }))}
          aria-pressed={tag === ""}
        >
          all
        </button>
        {TAGS.map((option) => (
          <button
            key={option}
            onClick={() => setParams(nextParams(params, { tag: option }))}
            aria-pressed={tag === option}
          >
            {option}
          </button>
        ))}
      </div>

      <label className="row">
        sort
        <select
          aria-label="sort"
          value={sort}
          onChange={(event) => setParams(nextParams(params, { sort: event.target.value as Sort }))}
        >
          {SORTS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="row">
        search
        <input
          aria-label="search"
          value={query}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            if (event.target.value === "") next.delete("q");
            else next.set("q", event.target.value);
            // replace, so five keystrokes do not become five history entries.
            setParams(next, { replace: true });
          }}
        />
      </label>

      <div className="row">
        <button
          onClick={() => setParams(nextParams(params, { page: page - 1 }))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span data-testid="page">page {page}</span>
        <button onClick={() => setParams(nextParams(params, { page: page + 1 }))}>Next</button>
      </div>

      <pre className="log" data-testid="url">
        /{params.toString() === "" ? "" : `?${params.toString()}`}
      </pre>
    </div>
  );
}

export const routes = [{ path: "/", Component: Filters }];

export function SearchParams() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });

  return (
    <div className="stack">
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1rem",
        }}
      >
        <RouterProvider router={router} />
      </div>

      <p className="note">
        Watch the query string. Defaults never appear. Changing the tag clears the page. Typing in
        the search box replaces rather than pushes, so one Back press leaves rather than five.
      </p>
    </div>
  );
}
