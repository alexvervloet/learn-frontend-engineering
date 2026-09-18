/**
 * Suspense, lazy, and use()
 * =========================
 * `Suspense` marks a part of the tree that is allowed to be missing for a
 * moment, and says what to show instead. Anything inside it that is not ready
 * yet suspends, and React shows the fallback rather than a half-built page.
 *
 * React 19's `use(promise)` is how a component reads a value that has not
 * arrived. It looks synchronous. It is not: it suspends the component until the
 * promise settles, then re-runs it with the value.
 *
 * **The promise must be cached.** This is the one thing to get right:
 *
 *   function Bio({ name }) {
 *     const bio = use(fetch(`/bio/${name}`));   // wrong. loops forever
 *   }
 *
 * A new promise on every render means a component that suspends on every render
 * and never settles. The promise has to come from somewhere stable: a cache
 * keyed by its inputs, as below, or a framework loader, or a data library. This
 * is a large part of why TanStack Query still earns its place next to `use`.
 *
 * `lazy()` is the same idea applied to code. The component's module is not
 * downloaded until something renders it, and the `Suspense` above it covers the
 * wait. The panel at the bottom is a separate chunk; it is requested on the
 * click, not on page load.
 *
 * **Switching to a transition keeps the old content on screen.** Without one,
 * changing the name unmounts the bio and the fallback flashes back in, which
 * feels like a page reload. Inside `startTransition`, React keeps showing the
 * previous bio until the new one is ready. The toggle in the demo makes the
 * difference obvious, and it is worth flipping back and forth a few times.
 *
 * If the promise rejects, the rejection is thrown from `use` and goes to the
 * nearest error boundary. `Suspense` handles waiting; it has nothing to say
 * about failure. You need both.
 */

// loadBio is exported for the tests, alongside the component, so Fast Refresh
// falls back to a full reload for this file. That is the right trade in a
// lesson: a pure function you can test without a DOM is worth more than hot
// reload on a file nobody is iterating on.
/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy, startTransition, use, useState } from "react";

const HeavyPanel = lazy(() => import("./11_heavy_panel"));

const BIOS: Record<string, string> = {
  Ada: "Ada Lovelace wrote the first published algorithm intended for a machine.",
  Grace: "Grace Hopper built the first compiler and argued that machines should read English.",
  Alan: "Alan Turing gave us a definition of computation that we are still using.",
};

// The cache is what makes `use` safe here. Same name, same promise, every
// render. Delete this Map and the component suspends forever.
const bioCache = new Map<string, Promise<string>>();

export function loadBio(name: string): Promise<string> {
  const cached = bioCache.get(name);
  if (cached !== undefined) return cached;

  const pending = new Promise<string>((resolve) => {
    setTimeout(() => resolve(BIOS[name] ?? "no record"), 400);
  });
  bioCache.set(name, pending);
  return pending;
}

function Bio({ name }: { name: string }) {
  const bio = use(loadBio(name));
  return <p data-testid="bio">{bio}</p>;
}

export function SuspenseAndUse() {
  const [name, setName] = useState("Ada");
  const [showPanel, setShowPanel] = useState(false);
  const [smooth, setSmooth] = useState(false);

  function select(next: string): void {
    // Inside a transition React keeps the current bio on screen while the next
    // one loads. Outside one it tears it down and shows the fallback.
    if (smooth) startTransition(() => setName(next));
    else setName(next);
  }

  return (
    <div className="stack">
      <div className="row">
        {Object.keys(BIOS).map((option) => (
          <button key={option} onClick={() => select(option)} aria-pressed={name === option}>
            {option}
          </button>
        ))}
      </div>

      <label className="row">
        <input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} />
        Switch inside a transition (no fallback flash)
      </label>

      <Suspense fallback={<p data-testid="bio-fallback">loading the bio…</p>}>
        <Bio name={name} />
      </Suspense>

      <hr style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)" }} />

      <button onClick={() => setShowPanel(true)} disabled={showPanel}>
        Load the lazy panel
      </button>
      {showPanel && (
        <Suspense fallback={<p data-testid="panel-fallback">fetching the chunk…</p>}>
          <HeavyPanel />
        </Suspense>
      )}

      <p className="note">
        Each bio loads once. Switch away and back: the second visit is instant, because the cache
        still holds the settled promise.
      </p>
    </div>
  );
}
