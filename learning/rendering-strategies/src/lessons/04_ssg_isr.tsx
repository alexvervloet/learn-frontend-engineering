/**
 * Static generation, and adding a clock to it
 * ===========================================
 * **SSG** runs the render at build time and writes HTML to a file. At request
 * time there is no server and no render: a CDN returns a file. It is the
 * fastest and cheapest thing available, and the price is that the page is the
 * same for everybody and as old as the last build.
 *
 * It stops working when either of those bites. Ten thousand product pages
 * means a ten-minute build, and an editor fixing a typo waits for all of it. A
 * personalised page cannot be built in advance at all.
 *
 * **ISR** is SSG with an expiry. Serve the stored copy; if it is older than
 * `revalidate` seconds, serve it anyway and rebuild it in the background. The
 * next visitor gets the fresh one. Nobody waits, ever, and the cost is that
 * one visitor after expiry deliberately sees stale content.
 *
 * That is stale-while-revalidate, and it is the same idea as HTTP's
 * `Cache-Control: stale-while-revalidate` and TanStack Query's `staleTime`. It
 * keeps reappearing because it is the only way to get a fast response and
 * fresh data without picking one.
 *
 * **On-demand revalidation** is the other half. An editor pressing publish
 * should not wait out a 3600-second window, so the CMS calls a webhook that
 * drops the stored copy and the next request rebuilds. Most real setups use a
 * long `revalidate` as a safety net and webhooks for anything that matters.
 *
 * **The bug to know about**: a burst of traffic the moment a page expires can
 * start one rebuild per request. `createIsrStore` in `src/render/ssg.ts` keeps
 * a `pending` set for exactly this, and the test fires ten simultaneous
 * requests and asserts two renders rather than eleven. It is the cache
 * stampede from the backend repo's caching module wearing a different hat.
 *
 * The simulator below runs the real store from `src/render/ssg.ts`.
 */
import { useRef, useState } from "react";

import { createIsrStore } from "../render/ssg";

type LogLine = { at: number; status: string; html: string };

export function SsgIsr() {
  const [log, setLog] = useState<LogLine[]>([]);
  const [clock, setClock] = useState(0);
  const [version, setVersion] = useState(1);
  const [builds, setBuilds] = useState(0);

  // Refs alongside the state, because the store's `now` and the render
  // function are closures the store calls later, and they need the newest
  // value rather than the one captured when they were created. Nothing reads
  // these during render; the state above is what the JSX uses.
  const clockRef = useRef(0);
  const versionRef = useRef(1);

  // useState with an initialiser, not useRef(createIsrStore(...)): the ref
  // version would call createIsrStore on every render and throw the result
  // away, which is a fresh cache being built and discarded each time.
  // The `now` closure reads clockRef when the *store* calls it, during a
  // request, not during a render. The rule cannot tell those apart and warns
  // about any ref reachable from a function passed elsewhere.
  // eslint-disable-next-line react-hooks/refs
  const [store] = useState(() =>
    createIsrStore({ revalidate: 60, now: () => 1_000_000 + clockRef.current * 1000 }),
  );

  async function request(): Promise<void> {
    const served = await store.serve("/products", async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return `<p>version ${versionRef.current}</p>`;
    });

    setLog((current) => [
      ...current,
      { at: clockRef.current, status: served.status, html: served.html },
    ]);
    setBuilds(store.buildCount());
  }

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => void request()}>Request the page</button>
        <button
          onClick={() => {
            clockRef.current += 30;
            setClock(clockRef.current);
          }}
        >
          Wait 30 seconds
        </button>
        <button
          onClick={() => {
            versionRef.current += 1;
            setVersion(versionRef.current);
          }}
        >
          Edit the content (now v{version})
        </button>
        <button
          onClick={() => {
            store.invalidate("/products");
            setBuilds(store.buildCount());
          }}
        >
          Publish (on-demand revalidate)
        </button>
      </div>

      <p className="note" data-testid="clock">
        clock: {clock}s · revalidate: 60s · renders so far: {builds}
      </p>

      <pre className="log" data-testid="log">
        {log.length === 0
          ? "no requests yet"
          : log.map((line) => `t=${line.at}s  ${line.status.padEnd(5)}  ${line.html}`).join("\n")}
      </pre>

      <p className="note">
        Request, edit, request again: still the old version, because it is fresh. Wait 30 twice,
        request: you get the old one marked <code>stale</code> and the rebuild happens behind it.
        Request once more and it is new.
      </p>
    </div>
  );
}
