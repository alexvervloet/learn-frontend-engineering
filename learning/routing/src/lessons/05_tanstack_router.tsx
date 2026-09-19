/**
 * TanStack Router: the URL, type-checked
 * ======================================
 * React Router hands you `useParams()` as `Record<string, string | undefined>`.
 * Every param is optional, every name is a string nobody checks, and a link to
 * a route that does not exist compiles fine:
 *
 *   const { slug } = useParams();        // string | undefined, always
 *   <Link to="/artcles/keys" />          // typo. Ships. 404s in production
 *
 * TanStack Router builds a type from the route tree, so the router knows every
 * path, every param and every search key that exists:
 *
 *   <Link to="/article/$slug" params={{ slug: "keys-in-lists" }} />
 *
 * A misspelled path is a compile error. A missing param is a compile error. And
 * `articleRoute.useParams()` returns `{ slug: string }`, not optional, because
 * a route cannot match without its own param.
 *
 * **Search params are validated and typed**, which is the bigger win.
 * `validateSearch` runs on every navigation, so the rest of the app gets a
 * parsed object rather than strings:
 *
 *   validateSearch: (search) => ({
 *     page: Number(search["page"] ?? 1),
 *     sort: search["sort"] === "oldest" ? "oldest" : "newest",
 *   })
 *
 * `useSearch()` then returns `{ page: number; sort: "newest" | "oldest" }`. No
 * `Number(params.get("page") ?? "1")` scattered through components, and a
 * hand-edited `?page=banana` is dealt with in one place. This is the same
 * "parse at the boundary" idea as the typescript-react module, applied to the
 * URL.
 *
 * This is not theoretical. The first version of the nav below had a plain
 * `<Link to="/">Index</Link>`, and `tsc` rejected it: the index route declares
 * search params, so a link to it has to supply them. React Router would have
 * accepted the same link and rendered page `NaN`.
 *
 * **The `Register` interface is how the types get everywhere.** Declaring your
 * router in the module augmentation below is what makes a bare `<Link>`
 * anywhere in the app know your route tree. Skip it and everything still runs,
 * with none of the checking.
 *
 * **What it costs.** A route tree assembled in code rather than a plain array,
 * a bigger dependency, and route definitions that are more verbose. What it
 * buys is that a rename breaks the build rather than a page. For an app with
 * more than a handful of routes, particularly one with meaningful search
 * params, that is usually worth it.
 */
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

type Sort = "newest" | "oldest";

const ARTICLES = [
  { slug: "render-and-commit", title: "Render and commit" },
  { slug: "keys-in-lists", title: "Keys in lists" },
];

const rootRoute = createRootRoute({
  component: () => (
    <div>
      <nav className="row" aria-label="Articles">
        {/* `search` is required here, and the compiler is the one that said
            so: the index route declares search params, so a link to it that
            omits them does not type-check. React Router would have shipped
            this link happily and rendered page NaN. */}
        <Link to="/" search={{ page: 1, sort: "newest" }}>
          Index
        </Link>
        {ARTICLES.map((article) => (
          // `to` and `params` are both checked against the route tree. Change
          // the path below to "/artcle/$slug" and this stops compiling.
          <Link key={article.slug} to="/article/$slug" params={{ slug: article.slug }}>
            {article.title}
          </Link>
        ))}
      </nav>
      <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0.75rem 0" }} />
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  // Runs on every navigation to this route. Everything downstream gets the
  // parsed shape, not strings.
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search["page"] ?? 1) || 1),
    sort: (search["sort"] === "oldest" ? "oldest" : "newest") satisfies Sort as Sort,
  }),
  component: function Index() {
    // { page: number; sort: "newest" | "oldest" }. No parsing here.
    const { page, sort } = indexRoute.useSearch();

    return (
      <div className="stack">
        <p data-testid="search">
          page {page}, sorted {sort}
        </p>

        <div className="row">
          <Link to="/" search={{ page: page + 1, sort }} data-testid="next">
            Next page
          </Link>
          <Link to="/" search={{ page, sort: sort === "newest" ? "oldest" : "newest" }}>
            Flip the sort
          </Link>
        </div>

        <p className="note">
          <code>?page=banana</code> renders page 1, because validateSearch dealt with it once
          instead of every component guessing.
        </p>
      </div>
    );
  },
});

const articleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/article/$slug",
  component: function Article() {
    // { slug: string }. Not optional: this route cannot match without it.
    const { slug } = articleRoute.useParams();

    return (
      <article data-testid="detail">
        <h4>{ARTICLES.find((item) => item.slug === slug)?.title ?? "Unknown"}</h4>
        <p className="note">
          slug: <code>{slug}</code>, typed <code>string</code> rather than{" "}
          <code>string | undefined</code>
        </p>
      </article>
    );
  },
});

const routeTree = rootRoute.addChildren([indexRoute, articleRoute]);

/** Exported so the test builds a router over the same tree. */
export function makeRouter(initialEntries: string[] = ["/"]) {
  return createRouter({ routeTree, history: createMemoryHistory({ initialEntries }) });
}

// This is what makes a bare <Link> anywhere in the app know the route tree.
// Without it everything still runs, with none of the checking.
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}

export function TanstackRouter() {
  const router = makeRouter();

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
        Every link above is checked against the route tree at compile time. In your editor, try
        changing one <code>to</code> to a path that does not exist.
      </p>
    </div>
  );
}
