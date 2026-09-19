import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads the OS "reduce motion" setting, and keeps reading it.
 *
 * `useSyncExternalStore` rather than `useState` plus an effect, for the same
 * reason as the lesson shell's `useHash`: the browser already owns this value,
 * and copying it into React state gives two sources of truth that disagree the
 * moment someone changes the setting with the tab open. People do change it
 * with the tab open, usually because your animation is making them ill.
 *
 * The `matchMedia` guard is for server rendering, where there is no window.
 * `getServerSnapshot` returns false, which is the safe default: animate, rather
 * than silently disabling motion for everyone on the first paint.
 *
 * Motion ships its own `useReducedMotion`. This is here because it is eight
 * lines and worth understanding rather than importing on faith.
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const list = window.matchMedia(QUERY);
    list.addEventListener("change", onStoreChange);
    return () => list.removeEventListener("change", onStoreChange);
  }, []);

  const getSnapshot = useCallback(() => window.matchMedia(QUERY).matches, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
