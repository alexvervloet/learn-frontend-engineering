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
 * The thing to get right is that a revalidation in flight must not start a
 * second one. Without the `pending` guard, a burst of traffic after expiry
 * kicks off a rebuild per request, which is the cache stampede from the
 * backend repo's caching module, in a different hat.
 */
export type Entry = { html: string; generatedAt: number };

export type StoreOptions = {
  /** Seconds before a stored page is considered stale. */
  revalidate: number;
  /** Injected so tests do not have to wait. */
  now?: () => number;
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

  async function build(key: string, render: () => Promise<string>): Promise<Entry> {
    builds += 1;
    const entry = { html: await render(), generatedAt: now() };
    entries.set(key, entry);
    return entry;
  }

  return {
    /** How many times the page was actually rendered. The number ISR exists to keep down. */
    buildCount: () => builds,

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
        void build(key, render).finally(() => pending.delete(key));
      }

      return { html: existing.html, status: "stale" };
    },

    /** What an on-demand revalidation webhook does: drop it and rebuild on the next request. */
    invalidate(key: string): void {
      entries.delete(key);
    },
  };
}
