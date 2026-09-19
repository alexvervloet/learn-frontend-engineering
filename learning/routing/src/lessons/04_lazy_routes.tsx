/**
 * Route-level code splitting
 * ==========================
 * The route is the right unit to split on. Not the component: a user on the
 * article page has no use for the settings page's form validation, its date
 * picker or the chart library it pulls in, and route boundaries are exactly
 * where a user's attention moves from one of those to the other.
 *
 * React Router's `lazy` takes the whole route definition, not just the
 * component:
 *
 *   {
 *     path: "settings",
 *     lazy: async () => {
 *       const mod = await import("./settings");
 *       return { Component: mod.default, loader: mod.loader };
 *     },
 *   }
 *
 * The loader ships in the same chunk. That matters: with `React.lazy` the
 * component is split but any data fetching inside it cannot start until the
 * chunk has downloaded *and* rendered, so you pay the two serially. Here the
 * router downloads the chunk and runs its loader as one navigation, and both
 * finish before anything renders.
 *
 * `path` stays in the parent bundle on purpose. The router has to know the
 * route exists to match the URL; only its implementation is deferred.
 *
 * **What is worth splitting.** Anything behind a click that most users do not
 * make: settings, admin, an editor, a checkout, a rich text field, a chart
 * library. What is not worth splitting: a route the first-time visitor always
 * lands on, and anything under a few kilobytes, where the extra request costs
 * more than the bytes saved.
 *
 * **Prefetch on hover** turns a deferred chunk back into an instant one. React
 * Router does this for `<Link>` with `prefetch` in framework mode; TanStack
 * Router does it by default on intent. Without prefetching, splitting trades a
 * faster first load for a slower first click, which is sometimes the wrong
 * trade.
 *
 * **A split route can fail to load.** A deploy mid-session leaves a user's page
 * asking for a chunk that no longer exists, and the navigation rejects. That is
 * what the error boundary on the route is for, and "reload the page" is a
 * legitimate thing for it to say.
 */
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  useNavigation,
  useRouteError,
} from "react-router";

function Layout() {
  const navigation = useNavigation();

  return (
    <div>
      <nav className="row" aria-label="Sections">
        <Link to="/">Home</Link>
        <Link to="/settings">Settings (lazy)</Link>
      </nav>
      <p className="note" data-testid="nav-state">
        {navigation.state === "idle" ? "idle" : `${navigation.state}…`}
      </p>
      <Outlet />
    </div>
  );
}

function Home() {
  return (
    <p data-testid="home">
      The settings chunk has not been requested yet. Open the network tab before clicking.
    </p>
  );
}

function ChunkError() {
  const error = useRouteError();

  return (
    <div role="alert" data-testid="chunk-error">
      <h4>That section failed to load</h4>
      <p className="note">
        Usually a deploy while the tab was open: the chunk this page is asking for is gone.
        Reloading fixes it.
      </p>
      <p className="note">{error instanceof Error ? error.message : "unknown"}</p>
    </div>
  );
}

export const routes = [
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      {
        path: "settings",
        // The path stays here so the router can match the URL. Everything else
        // arrives with the chunk.
        lazy: async () => {
          const mod = await import("./04_settings_panel");
          return { Component: mod.default, loader: mod.loader };
        },
        ErrorBoundary: ChunkError,
      },
    ],
  },
];

export function LazyRoutes() {
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
        The build output for this module has a separate <code>04_settings_panel</code> chunk. It is
        fetched on the click, and its loader runs in the same navigation rather than after it.
      </p>
    </div>
  );
}
