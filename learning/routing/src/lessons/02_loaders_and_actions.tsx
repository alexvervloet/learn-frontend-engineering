/**
 * Loaders and actions
 * ===================
 * A data router moves fetching *out* of the component. The loader runs while
 * the navigation is in flight, and the component renders once, with data:
 *
 *   { path: ":slug", loader: ({ params }) => getArticle(params.slug), Component: Detail }
 *
 * Compare that with fetching in an effect. There, the component mounts, renders
 * a spinner, commits, runs the effect, fetches, and renders again. Worse, a
 * child that fetches something else does not start until *its* parent has
 * rendered, so a three-level tree makes three sequential round trips. That is
 * the request waterfall, and moving the fetch into the route is what removes
 * it: every loader on the matched route chain starts at once.
 *
 * **`useNavigation` is where the pending UI goes.** Since the old page stays on
 * screen until the new data arrives, without it a slow navigation looks like a
 * dead link. `navigation.state` is `"idle" | "loading" | "submitting"`.
 *
 * **Actions are the write half.** `<Form method="post">` posts to the route's
 * action instead of the network, and React Router revalidates every loader on
 * the page afterwards. That revalidation is the part worth noticing: you do not
 * tell it which data went stale, the way you would with `invalidateQueries`.
 * The trade is that it refetches things that did not change.
 *
 * **Throw a Response for an error with a status.**
 *
 *   throw new Response("Not found", { status: 404 });
 *
 * The nearest `ErrorBoundary` catches it, and `isRouteErrorResponse` narrows it
 * so you can tell a 404 from a thrown `TypeError`. Without that check you
 * render "Something went wrong" for a missing article, which is wrong and
 * unhelpful.
 *
 * **Where this leaves TanStack Query.** Loaders solve the waterfall and the
 * data-on-first-render problem. They do not give you a cache across
 * navigations: going back to a list re-runs its loader. Many apps use both, with
 * the loader calling `queryClient.ensureQueryData`.
 */
import {
  Form,
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  isRouteErrorResponse,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";

import { getArticle, listArticles, type Article } from "../data";

// Comments live in module state so an action has something to change.
const comments = new Map<string, string[]>();

export function resetComments(): void {
  comments.clear();
}

function Layout() {
  const navigation = useNavigation();

  return (
    <div>
      <nav className="row" aria-label="Articles">
        <Link to="/">All</Link>
        <Link to="/render-and-commit">Render and commit</Link>
        <Link to="/keys-in-lists">Keys in lists</Link>
        <Link to="/missing">A missing one</Link>
      </nav>

      {/* The old page stays up while the loader runs, so without this there is
          no sign anything is happening. */}
      <p className="note" data-testid="nav-state">
        {navigation.state === "idle" ? "idle" : `${navigation.state}…`}
      </p>

      <Outlet />
    </div>
  );
}

function List() {
  // Typed by the loader it belongs to.
  const articles = useLoaderData<Article[]>();

  return (
    <ul data-testid="list">
      {articles.map((article) => (
        <li key={article.id}>
          <Link to={`/${article.slug}`}>{article.title}</Link>
        </li>
      ))}
    </ul>
  );
}

function Detail() {
  const { article, comments: existing } = useLoaderData<{ article: Article; comments: string[] }>();
  const navigation = useNavigation();

  return (
    <article data-testid="detail">
      <h4>{article.title}</h4>
      <p>{article.body}</p>

      <ul data-testid="comments">
        {existing.map((comment) => (
          <li key={comment}>{comment}</li>
        ))}
      </ul>

      {/* Not onSubmit and not fetch. This posts to the route's action, and
          every loader on the page revalidates afterwards. */}
      <Form method="post" className="row">
        <input name="comment" aria-label="Comment" placeholder="say something" />
        <button type="submit" disabled={navigation.state === "submitting"}>
          {navigation.state === "submitting" ? "Posting…" : "Post"}
        </button>
      </Form>
    </article>
  );
}

function RouteError() {
  const error = useRouteError();

  // The narrowing that lets a 404 read as a 404.
  if (isRouteErrorResponse(error)) {
    return (
      <div role="alert" data-testid="error">
        <h4>
          {error.status} {error.statusText}
        </h4>
        <Link to="/">Back to the list</Link>
      </div>
    );
  }

  return (
    <div role="alert" data-testid="error">
      <h4>Something went wrong</h4>
      <p>{error instanceof Error ? error.message : "unknown"}</p>
    </div>
  );
}

export const routes = [
  {
    path: "/",
    Component: Layout,
    ErrorBoundary: RouteError,
    children: [
      {
        index: true,
        loader: () => listArticles(),
        Component: List,
      },
      {
        path: ":slug",
        loader: async ({ params }: { params: { slug?: string } }) => {
          const article = await getArticle(params.slug ?? "");

          // A Response, not an Error: it carries a status the boundary can read.
          if (article === null) throw new Response("Not Found", { status: 404 });

          return { article, comments: comments.get(article.slug) ?? [] };
        },
        action: async ({ request, params }: { request: Request; params: { slug?: string } }) => {
          const data = await request.formData();
          const comment = String(data.get("comment") ?? "").trim();
          const slug = params.slug ?? "";

          if (comment === "") return { ok: false };

          comments.set(slug, [...(comments.get(slug) ?? []), comment]);
          // Nothing tells the loader to re-run. React Router revalidates every
          // loader on the page after an action, by default.
          return { ok: true };
        },
        Component: Detail,
        ErrorBoundary: RouteError,
      },
    ],
  },
];

export function LoadersAndActions() {
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
        Click an article: the old page stays until the data is there, which is why the pending line
        matters. Post a comment and the loader re-runs without being asked. “A missing one” throws a
        404 and the boundary reads the status off it.
      </p>
    </div>
  );
}
