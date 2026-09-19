import { useSyncExternalStore } from "react";

/**
 * A store in about thirty lines, so the libraries stop being magic.
 *
 * Every store in this module is the same three pieces:
 *
 *   a value      held outside React
 *   subscribe    a set of callbacks to run when it changes
 *   getSnapshot  read the current value
 *
 * `useSyncExternalStore` is the React side, and it is the reason a store can do
 * something context cannot: the component re-renders only when the value *it*
 * selected changes, because React compares the snapshot rather than the whole
 * store.
 *
 * Two details that look small and are not.
 *
 * `getSnapshot` must return a value that is `Object.is`-equal between renders
 * when nothing changed. Returning a fresh object, such as
 * `{ name: state.name }`, means a new reference every time and therefore an
 * infinite render loop. That is the classic `useSyncExternalStore` bug, and it
 * is why selectors returning objects need an equality function.
 *
 * `setState` replaces rather than mutates. Mutating the object in place would
 * leave the snapshot referentially equal, so React would see no change and skip
 * the render.
 */
export type Store<T> = {
  getState: () => T;
  setState: (updater: (current: T) => T) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    getState: () => state,

    setState: (updater) => {
      const next = updater(state);
      // Bail out if nothing changed, the way React does for setState.
      if (Object.is(next, state)) return;
      state = next;
      for (const listener of listeners) listener();
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/**
 * Subscribe to one slice. `selector` runs on every store change, and the
 * component only re-renders when what it returns actually differs.
 */
export function useStore<T, S>(store: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}
