import { useCallback, useSyncExternalStore } from "react";

// The browser already stores "which lesson am I on" in the URL. Copying it into
// React state would mean two sources of truth that drift apart the moment
// someone presses Back. useSyncExternalStore subscribes to the browser's copy
// instead, so there is only ever one.

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getSnapshot(): string {
  return window.location.hash.replace(/^#/, "");
}

// Rendered on a server there is no location, and returning "" every time keeps
// the snapshot stable. Returning a fresh object here is the classic
// useSyncExternalStore infinite-loop bug.
function getServerSnapshot(): string {
  return "";
}

export function useHash(): [string, (next: string) => void] {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setHash = useCallback((next: string) => {
    window.location.hash = next;
  }, []);

  return [hash, setHash];
}
