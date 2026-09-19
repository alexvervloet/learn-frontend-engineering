/**
 * A controllable `matchMedia`, for tests.
 *
 * The repo-wide stub in `config/vitest.setup.ts` always reports `matches:
 * false`, which is right as a default and useless for testing a media query.
 * This one lets a test say which queries match and then change its mind, so the
 * `change` listener path gets covered too.
 *
 * It lives in `src` because that is what the module's tsconfig includes.
 * Nothing imports it from the app, so it never reaches the bundle.
 */
export type MatchMediaStub = {
  matchMedia: (query: string) => MediaQueryList;
  /** Flip a query and notify every listener, the way an OS setting change does. */
  set: (query: string, matches: boolean) => void;
};

export function createMatchMediaStub(initial: Record<string, boolean> = {}): MatchMediaStub {
  const state = new Map(Object.entries(initial));
  const listeners = new Map<string, Set<() => void>>();

  function matchMedia(query: string): MediaQueryList {
    return {
      matches: state.get(query) ?? false,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        const set = listeners.get(query) ?? new Set();
        set.add(listener as () => void);
        listeners.set(query, set);
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.get(query)?.delete(listener as () => void);
      },
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  }

  function set(query: string, matches: boolean): void {
    state.set(query, matches);
    for (const listener of listeners.get(query) ?? []) listener();
  }

  return { matchMedia, set };
}
