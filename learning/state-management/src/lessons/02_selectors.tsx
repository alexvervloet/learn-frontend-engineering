/**
 * Subscribing to a slice
 * ======================
 * This is the thing a store does that context cannot. A context consumer
 * re-renders whenever the context value changes, full stop. A store subscriber
 * re-renders only when the part *it selected* changes.
 *
 *   const name = useStore(store, (s) => s.name);   // ignores every other field
 *
 * The mechanism is `useSyncExternalStore`, and `src/store.ts` implements the
 * whole thing in about thirty lines. Zustand, Redux and Jotai are all more
 * careful versions of it. Reading that file once makes the rest of this module
 * much less mysterious.
 *
 * The demo has three panels over one store. Changing the count re-renders the
 * count panel only. The panel reading `name` does not move, and neither does
 * the one reading nothing.
 *
 * **A selector returning a new object defeats the whole thing.**
 *
 *   useStore(store, (s) => ({ name: s.name }))     // new object every time
 *
 * `useSyncExternalStore` compares snapshots with `Object.is`. A fresh object is
 * never equal to the last one, so the component re-renders on every store
 * change, and in the worst case React detects the unstable snapshot and throws
 * "The result of getSnapshot should be cached". Three ways out, in order of
 * preference:
 *
 *   one selector per value      useStore(s => s.name), useStore(s => s.count)
 *   a shallow equality function what Zustand's `useShallow` is for
 *   memoise the derived value   when it is genuinely expensive
 *
 * The first is almost always right and is what the demo does. Two subscriptions
 * cost far less than a re-render.
 *
 * **Selectors run on every store change**, including ones they ignore, so keep
 * them cheap. Sorting or filtering a list inside a selector runs on every
 * unrelated update; do it in the component, or memoise it.
 */
import { createStore, useStore } from "../store";
import { useRenderCount } from "../useRenderCount";

type AppState = { count: number; name: string; theme: "light" | "dark" };

export const appStore = createStore<AppState>({ count: 0, name: "Ada", theme: "light" });

export const actions = {
  increment: () => appStore.setState((s) => ({ ...s, count: s.count + 1 })),
  rename: (name: string) => appStore.setState((s) => ({ ...s, name })),
  reset: () => appStore.setState(() => ({ count: 0, name: "Ada", theme: "light" })),
};

function CountPanel() {
  const count = useStore(appStore, (state) => state.count);
  const renders = useRenderCount();

  return (
    <p>
      count {count} · <span data-testid="count-renders">{renders}</span> renders
    </p>
  );
}

function NamePanel() {
  const name = useStore(appStore, (state) => state.name);
  const renders = useRenderCount();

  return (
    <p>
      name {name} · <span data-testid="name-renders">{renders}</span> renders
    </p>
  );
}

function Bystander() {
  // Subscribes to nothing at all.
  const renders = useRenderCount();

  return (
    <p>
      reads nothing · <span data-testid="bystander-renders">{renders}</span> renders
    </p>
  );
}

export function Selectors() {
  return (
    <div className="stack">
      <div className="row">
        <button onClick={actions.increment}>Increment the count</button>
        <button onClick={() => actions.rename(`Ada ${Math.floor(Math.random() * 100)}`)}>
          Change the name
        </button>
        <button onClick={actions.reset}>Reset</button>
      </div>

      <CountPanel />
      <NamePanel />
      <Bystander />

      <p className="note">
        One store, three panels. Increment and only the count panel moves. Compare with lesson 01,
        where everything under the parent re-rendered on every keystroke.
      </p>
    </div>
  );
}
