/**
 * Static generation and incremental regeneration, as the twenty lines they
 * actually are.
 *
 * SSG is "run the render at build time and write the HTML to a file". There is
 * no server at request time: a CDN serves a file, which is why it is the
 * fastest and cheapest thing you can do, and why it cannot show anything
 * user-specific.
 *
 * ISR is SSG plus a clock. Serve the stored copy; if it is older than
 * `revalidate` seconds, serve it anyway and rebuild it in the background, so
 * the *next* visitor gets the fresh one. Nobody waits. The price is that the
 * first visitor after expiry sees stale content, deliberately.
 *
 * That "serve stale, rebuild behind" is stale-while-revalidate, the same idea
 * as HTTP's `Cache-Control: stale-while-revalidate` and as TanStack Query's
 * staleTime. It keeps turning up because it is the only way to have both a
 * fast response and fresh data.
 *
 * Two things to get right, and both are about the rebuild nobody is waiting
 * for.
 *
 * **A revalidation in flight must not start a second one.** Without the
 * `pending` guard, a burst of traffic after expiry kicks off a rebuild per
 * request, which is the cache stampede from the backend repo's caching
 * module, in a different hat.
 *
 * **A rebuild that throws must not take the process down.** Nothing awaits
 * it, so a rejection is an unhandled rejection, and Node exits on one of
 * those by default. The visitor is fine either way, because they were
 * answered from the cache before the rebuild started; it is the server that
 * dies. Catch it, count it, hand it to `onError`, and let the next request
 * try again.
 */
export type Entry = { html: string; generatedAt: number };

export type StoreOptions = {
  /** Seconds before a stored page is considered stale. */
  revalidate: number;
  /** Injected so tests do not have to wait. */
  now?: () => number;
  /**
   * Where a failed background rebuild goes. There is nobody to return it
   * to: the visitor who triggered it was answered from the cache before it
   * started, and the next one will be too. Without this the failure is
   * silent and the page is stale until someone notices.
   */
  onError?: (error: unknown, key: string) => void;
};

export type Served = {
  html: string;
  /** "miss" built it now, "hit" was fresh, "stale" served old and rebuilt behind. */
  status: "miss" | "hit" | "stale";
};

export function createIsrStore(options: StoreOptions) {
  const { revalidate, now = () => Date.now() } = options;

  const entries = new Map<string, Entry>();
  const pending = new Set<string>();
  let builds = 0;
  let failures = 0;

  async function build(key: string, render: () => Promise<string>): Promise<Entry> {
    // After the await, so `buildCount` is renders that produced a page
    // rather than renders that were attempted. A failed rebuild is counted
    // by `failureCount` instead, and conflating the two makes the number
    // ISR exists to keep down impossible to read.
    const html = await render();
    builds += 1;

    const entry = { html, generatedAt: now() };
    entries.set(key, entry);
    return entry;
  }

  return {
    /** How many times the page was actually rendered. The number ISR exists to keep down. */
    buildCount: () => builds,

    /** How many background rebuilds threw. Zero is the only good value. */
    failureCount: () => failures,

    async serve(key: string, render: () => Promise<string>): Promise<Served> {
      const existing = entries.get(key);

      // Nothing stored: the only case where a visitor waits.
      if (existing === undefined) {
        const entry = await build(key, render);
        return { html: entry.html, status: "miss" };
      }

      const ageSeconds = (now() - existing.generatedAt) / 1000;
      if (ageSeconds < revalidate) return { html: existing.html, status: "hit" };

      // Stale. Answer immediately with what we have, and rebuild behind it,
      // but only if a rebuild is not already running.
      if (!pending.has(key)) {
        pending.add(key);

        // The catch is not defensive programming, it is the difference
        // between a stale page and no server. Nothing is awaiting this
        // promise, so a render that throws is an unhandled rejection, and
        // Node's default for one of those is to exit. A CMS being briefly
        // down would take the whole site with it.
        //
        // Failing is the right outcome here anyway: the stored copy is
        // still being served, and the next request tries again. What you
        // must not do is lose the error, so it goes to onError.
        void build(key, render)
          .catch((error: unknown) => {
            failures += 1;
            options.onError?.(error, key);
          })
          .finally(() => pending.delete(key));
      }

      return { html: existing.html, status: "stale" };
    },

    /** What an on-demand revalidation webhook does: drop it and rebuild on the next request. */
    invalidate(key: string): void {
      entries.delete(key);
    },
  };
}
