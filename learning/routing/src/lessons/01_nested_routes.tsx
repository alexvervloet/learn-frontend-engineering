/**
 * Nested routes and layouts
 * =========================
 * A route is not just a URL to a page. It is a *segment*, and segments nest, so
 * the URL describes a stack of components rather than one of them:
 *
 *   /articles            ArticlesLayout  +  index
 *   /articles/keys       ArticlesLayout  +  ArticleDetail
 *
 * `ArticlesLayout` renders once and stays mounted as you move between
 * articles. Its scroll position, its open filters and any state it holds all
 * survive, because React never unmounts it. That is the thing a flat list of
 * routes cannot do, and rebuilding it by hand means lifting state above the
 * router and putting it back on every navigation.
 *
 * `<Outlet />` is where the child renders. A layout without one renders nothing
 * of its children and gives no error, which is the first thing to check when a
 * nested route "does not work".
 *
 * **An index route** is the child shown at the parent's own path. `/articles`
 * with no article selected is not a special case in the layout; it is a route.
 *
 * **`Link` versus `NavLink`.** Both navigate without a page load. `NavLink`
 * additionally knows whether it is active, and hands you that as a function:
 *
 *   <NavLink className={({ isActive }) => (isActive ? "on" : undefined)} />
 *
 * Use `aria-current="page"` as well, which `NavLink` sets for you. A colour
 * change alone tells a screen reader nothing.
 *
 * **Relative paths resolve against the route, not the URL.** `<Link to="keys">`
 * inside the articles layout goes to `/articles/keys`. A leading slash makes it
 * absolute. Getting this wrong is what produces `/articles/articles/keys`.
 *
 * **The splat route `*` catches everything else.** Put a real 404 there. The
 * default is a bare error page that says nothing useful.
 *
 * Every lesson in this module builds a `createMemoryRouter` rather than a
 * browser router. Two reasons: the lesson shell already owns the real URL for
 * choosing lessons, and a memory router is what you use in tests anyway, so the
 * demo and the test run the same thing.
 */
import { Link, NavLink, Outlet, RouterProvider, createMemoryRouter, useParams } from "react-router";

const ARTICLES = [
  { slug: "render-and-commit", title: "Render and commit" },
  { slug: "keys-in-lists", title: "Keys in lists" },
];

function ArticlesLayout() {
  return (
    <div>
      <nav className="row" aria-label="Articles">
        {ARTICLES.map((article) => (
          <NavLink
            key={article.slug}
            // Relative: resolved against this route, so it becomes
            // /articles/<slug> rather than /<slug>.
            to={article.slug}
            className={({ isActive }) => (isActive ? "active-link" : undefined)}
            style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400 })}
          >
            {article.title}
          </NavLink>
        ))}
        <Link to="/nowhere">A broken link</Link>
      </nav>

      <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "0.75rem 0" }} />

      {/* Without this, the children render nowhere and nothing warns. */}
      <Outlet />
    </div>
  );
}

function ArticlesIndex() {
  return <p data-testid="index">Pick an article. This is the index route, not a special case.</p>;
}

function ArticleDetail() {
  // Typed as string | undefined: the router cannot prove a param exists.
  const { slug } = useParams();

  return (
    <article data-testid="detail">
      <h4>{ARTICLES.find((article) => article.slug === slug)?.title ?? "Unknown"}</h4>
      <p className="note">
        slug: <code>{slug}</code>
      </p>
    </article>
  );
}

function NotFound() {
  return (
    <div data-testid="not-found">
      <h4>Nothing here</h4>
      <Link to="/articles">Back to the articles</Link>
    </div>
  );
}

/** Exported so the test builds the same routes the demo does. */
export const routes = [
  {
    path: "/articles",
    Component: ArticlesLayout,
    children: [
      { index: true, Component: ArticlesIndex },
      { path: ":slug", Component: ArticleDetail },
    ],
  },
  { path: "*", Component: NotFound },
];

export function NestedRoutes() {
  const router = createMemoryRouter(routes, { initialEntries: ["/articles"] });

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
        The nav above is rendered by the layout route. Moving between articles never unmounts it, so
        anything it is holding stays put. The broken link lands on the splat route.
      </p>
    </div>
  );
}
