/**
 * View transitions
 * ================
 * The browser animates between two states of the page, and you write almost
 * none of it.
 *
 *   document.startViewTransition(updateTheDom);
 *
 * What happens: the browser screenshots the current page, runs your callback,
 * screenshots the new page, and cross-fades between the two. Nothing about
 * your components changes. There is no animation library, no `AnimatePresence`,
 * no keeping the old component mounted while it fades.
 *
 * **`view-transition-name` is how it knows what became what.** Give an element
 * the same name before and after, and instead of cross-fading it, the browser
 * moves and resizes the old one into the new one's position. That is a shared
 * element transition, and it used to be a genuinely hard thing to build.
 *
 * **The name must be unique in the document when the snapshot is taken.** This
 * is the gotcha, and it deserves the bold. Two elements with the same
 * `view-transition-name` abort the entire transition. The DOM still updates, so
 * the app keeps working and only the animation is missing, which is why it
 * survives review. That is also why the demo puts the name on one row at a time
 * with an inline style rather than in a CSS rule that would match every row.
 *
 * Chromium does tell you, and it is worth knowing where to look:
 *
 *     Unexpected duplicate view-transition-name: card
 *     InvalidStateError: Transition was aborted because of invalid state.
 *
 * Both are console errors rather than thrown exceptions, so nothing stops and
 * no error boundary fires. The e2e spec asserts the exact wording, because "the
 * browser warns you" is a claim with a shelf life.
 *
 * **The callback can be async, and the browser is holding a screenshot while
 * you wait.** `startViewTransition(async () => { await fetchStuff() })` freezes
 * the page for the length of that fetch. Update the DOM in the callback and do
 * the fetching outside it.
 *
 * **Three promises, and they mean different things.**
 *
 *   transition.updateCallbackDone  your callback finished
 *   transition.ready               the pseudo-elements exist, animation starts
 *   transition.finished            the animation is over
 *
 * `ready` rejects if the transition is skipped, including for the duplicate
 * name above, so an unhandled `.ready` is a stray rejection waiting to happen.
 *
 * **React Router does the plumbing for a navigation.** `<Link viewTransition>`
 * wraps that navigation's DOM update in `startViewTransition`, and
 * `useViewTransitionState(href)` tells a component whether *this* transition is
 * the one heading to that href, which is exactly what you need to apply a name
 * to one element and no other.
 *
 * **React has its own `<ViewTransition>`.** It is for transitions inside a
 * component tree rather than across a navigation, and it works with
 * `startTransition` and `useDeferredValue` rather than with the router. Both
 * end up calling the same browser API.
 *
 * Feature detection is required. Safari and Firefox arrived later than Chrome
 * and a browser without it must simply not animate, which `withViewTransition`
 * below does by running the callback directly.
 */
import { useState } from "react";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryRouter,
  useParams,
  useViewTransitionState,
} from "react-router";

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

/**
 * Run a DOM update inside a view transition where there is one, and directly
 * where there is not.
 *
 * Returns a promise that settles when the change is on screen either way, so
 * a caller does not have to branch. Note the `.catch`: a skipped transition
 * rejects `ready`, and a duplicate `view-transition-name` skips transitions
 * all the time.
 */
export function withViewTransition(update: () => void): Promise<void> {
  if (!supportsViewTransitions()) {
    update();
    return Promise.resolve();
  }

  const transition = document.startViewTransition(update);

  // `finished` rather than `ready`: the caller wants "it is done", and
  // `finished` resolves even when the animation was skipped.
  return transition.finished.catch(() => undefined);
}

const ITEMS = [
  { id: "kingfisher", name: "Kingfisher", note: "Fast, low, and over water." },
  { id: "wren", name: "Wren", note: "Louder than anything that small should be." },
  { id: "swift", name: "Swift", note: "Lands once a year, if that." },
];

/* ------------------------------------------------------------------ *
 * 1. The platform API, with no router involved
 * ------------------------------------------------------------------ */

function PlainApi() {
  const [expanded, setExpanded] = useState(false);
  const [skipped, setSkipped] = useState(false);

  function toggle(): void {
    // The DOM change goes inside the callback. Anything slow goes outside it,
    // because the browser is showing a frozen screenshot until this resolves.
    void withViewTransition(() => {
      setExpanded((open) => !open);
    });
  }

  function toggleDuplicated(): void {
    setSkipped(true);
    void withViewTransition(() => {
      setExpanded((open) => !open);
    });
  }

  return (
    <div className="stack">
      <p className="note">
        The panel below cross-fades rather than appearing. Nothing here is an animation library: it
        is one call and one CSS name.
      </p>

      <div className="row">
        <button type="button" onClick={toggle} data-testid="vt-toggle">
          {expanded ? "Collapse" : "Expand"}
        </button>
        <button type="button" onClick={toggleDuplicated} data-testid="vt-duplicate">
          Toggle with a duplicated name
        </button>
      </div>

      <div
        className="vt-card vt-detail"
        data-testid="vt-panel"
        // One element, one name. See the duplicate button for what happens
        // when that stops being true.
        style={{ viewTransitionName: "card" }}
      >
        {expanded ? "Expanded. The browser tweened between the two sizes." : "Collapsed."}
      </div>

      {skipped && (
        <div
          className="vt-card"
          data-testid="vt-duplicate-panel"
          // Deliberately the same name as the panel above. Two elements
          // sharing a name abort the transition: the DOM still updates and
          // nothing animates. Chromium logs "Unexpected duplicate
          // view-transition-name: card", which is easy to miss and is the
          // only sign you get.
          style={{ viewTransitionName: "card" }}
        >
          <p className="note">
            This has <code>view-transition-name: card</code> too. From now on the toggle above
            changes instantly, because a duplicated name skips the transition entirely. Open the
            console: Chromium says <code>Unexpected duplicate view-transition-name: card</code>.
            Reload the lesson to get the animation back.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2. Across a navigation, with React Router
 * ------------------------------------------------------------------ */

/**
 * `useViewTransitionState(href)` is true only while a transition to that href
 * is running. That is what makes the name unique: without it every row in the
 * list would carry `view-transition-name: item` at once, and nothing would
 * ever animate.
 */
function ItemLink({ id, name }: { id: string; name: string }) {
  const href = `/item/${id}`;
  const transitioning = useViewTransitionState(href);

  return (
    <Link
      to={href}
      // Wraps this navigation's DOM update in startViewTransition.
      viewTransition
      className="vt-card"
      data-testid={`link-${id}`}
      data-transitioning={transitioning}
      style={{ viewTransitionName: transitioning ? "item" : "none" }}
    >
      {name}
    </Link>
  );
}

function ItemList() {
  return (
    <div className="stack" data-testid="item-list">
      {ITEMS.map((item) => (
        <ItemLink key={item.id} id={item.id} name={item.name} />
      ))}
    </div>
  );
}

function ItemDetail() {
  // The detail panel takes the same name, so the browser moves the row into
  // it rather than cross-fading two unrelated rectangles.
  return (
    <div className="stack">
      <div className="vt-card vt-detail" style={{ viewTransitionName: "item" }}>
        <Outlet />
      </div>
      <Link to="/" viewTransition data-testid="back">
        Back
      </Link>
    </div>
  );
}

function ItemBody() {
  // `useParams`, not `window.location`. This demo runs in a MemoryRouter, which
  // keeps its history in an array and never touches the address bar, so
  // reading `window.location.pathname` here would return the lesson shell's
  // own URL and never change. The same is true of any router under test.
  const { id } = useParams();
  const item = ITEMS.find((candidate) => candidate.id === id);

  if (item === undefined) return <p>No such bird.</p>;

  return (
    <>
      <h3 data-testid="detail-name">{item.name}</h3>
      <p>{item.note}</p>
    </>
  );
}

/**
 * A data router, and it has to be one.
 *
 * `useViewTransitionState` throws "must be used within a data router" under
 * `<MemoryRouter>` or `<BrowserRouter>`. Those are the component routers; they
 * have no navigation state to ask about, and the whole question the hook
 * answers is "is a navigation to this href in flight". `createMemoryRouter`
 * plus `<RouterProvider>` is the data router, and it is what lesson 02 uses
 * for loaders and actions for the same underlying reason.
 */
const routes = [
  { path: "/", element: <ItemList /> },
  {
    path: "/item/:id",
    element: <ItemDetail />,
    children: [{ index: true, element: <ItemBody /> }],
  },
];

function RoutedDemo() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  return <RouterProvider router={router} />;
}

/* ------------------------------------------------------------------ */

export function ViewTransitions() {
  const [supported] = useState(supportsViewTransitions);

  return (
    <div className="stack">
      <p className="note" data-testid="vt-support">
        startViewTransition: {supported ? "yes" : "no"}
      </p>

      {!supported && (
        <p className="note">
          This browser has no view transitions, so everything below still works and none of it
          animates. That is the required behaviour, not a degraded mode.
        </p>
      )}

      <section className="stack">
        <h3>The platform API</h3>
        <PlainApi />
      </section>

      <section className="stack">
        <h3>Across a navigation</h3>
        <p className="note">
          Each row carries <code>view-transition-name</code> only while the transition to its own
          URL is running, via <code>useViewTransitionState</code>. Give every row the name at once
          and nothing animates at all.
        </p>
        <RoutedDemo />
      </section>
    </div>
  );
}
