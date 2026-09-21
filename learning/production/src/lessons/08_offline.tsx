/**
 * PWA, offline, and the service worker you should be slightly afraid of
 * =====================================================================
 * A progressive web app is three things the platform already gives you: a
 * manifest so it can be installed, a service worker so it can answer requests
 * without the network, and HTTPS because both require a secure context.
 *
 * **The service worker deserves respect.** It sits between every request the
 * app makes and the network, it outlives the page that installed it, and a bad
 * one is cached on your users' machines until they clear site data. There is no
 * deploy that fixes a worker nobody will fetch again. That is why the first
 * thing to write is not the caching, it is the kill switch:
 *
 *     self.addEventListener("install", () => self.skipWaiting());
 *     self.addEventListener("activate", async () => {
 *       await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
 *       await self.registration.unregister();
 *     });
 *
 * Keep that in a file you can deploy in a hurry.
 *
 * **The caching rule is the same one nginx uses**, for the same reason, and
 * lesson 07 already made the argument:
 *
 *   hashed assets    cache first, forever. The content hash is in the
 *                    filename, so a cached copy cannot be stale. This is what
 *                    hashed filenames are *for*.
 *   navigations      network first, cached shell as the fallback. Serve a
 *                    cached `index.html` and you pin people to a deploy whose
 *                    asset URLs may already be gone. That is the white screen
 *                    that clears up on its own over several hours.
 *   API responses    network only. The most common service worker bug in
 *                    existence is an API response cached by accident, and it
 *                    arrives as a bug report about data that will not update.
 *
 * **Deleting old caches is not tidying up.** Without the `activate` handler,
 * every deploy leaves another full copy of the app on disk until the browser
 * evicts the whole origin, taking the data you did mean to keep with it.
 *
 * **`skipWaiting` has a cost.** By default a new worker waits until every tab
 * using the old one has closed, which can be days. `skipWaiting()` takes over
 * at once, and then a page that has already loaded some of build A can request
 * the rest and be handed build B. Either accept that and reload on
 * `controllerchange`, or leave the wait in and show a "refresh to update"
 * prompt. Choosing neither is choosing the first one by accident.
 *
 * **Use Workbox in an app.** `vite-plugin-pwa` wraps it, generates the
 * precache list from the build output, and handles revisioning. The worker in
 * `public/sw.js` is eighty lines so you can read all of it once, which is worth
 * doing before handing the job to a tool whose output you cannot debug.
 *
 * The decisions worth testing are pure and live in `src/lib/offline.ts`. What
 * a browser actually does with them is in `e2e/offline.spec.ts`, which
 * registers the worker, goes offline, and reloads.
 */
import { useEffect, useState } from "react";

import {
  checkManifest,
  registerServiceWorker,
  strategyFor,
  type RegistrationOutcome,
} from "../lib/offline";

const EXAMPLES = [
  { label: "a page load", request: { url: "/", mode: "navigate" } },
  { label: "a hashed script", request: { url: "/assets/index-B2HYv2F6.js" } },
  { label: "a hashed stylesheet", request: { url: "/assets/index-CfFrHwYC.css" } },
  { label: "an API call", request: { url: "/api/flags" } },
  { label: "someone else's CDN", request: { url: "https://cdn.example.com/lib.js" } },
  { label: "an unhashed file", request: { url: "/logo.svg" } },
] as const;

export function Offline() {
  const [outcome, setOutcome] = useState<RegistrationOutcome | null>(null);
  const [manifest, setManifest] = useState<{ ok: boolean; problems: string[] } | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // navigator.onLine is a weak signal: it reports whether there is a network
    // interface, not whether anything is reachable. Good enough for a badge,
    // useless as the thing a retry depends on.
    const update = (): void => setOnline(navigator.onLine);
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  async function register(): Promise<void> {
    setOutcome(await registerServiceWorker());
  }

  async function inspectManifest(): Promise<void> {
    const response = await fetch("/manifest.webmanifest");
    setManifest(checkManifest((await response.json()) as Record<string, unknown>));
  }

  return (
    <div className="stack">
      <p className="note">
        network: <strong data-testid="online">{online ? "online" : "offline"}</strong>
      </p>

      <section className="stack">
        <h3>Which strategy each request gets</h3>
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">Request</th>
              <th scope="col">URL</th>
              <th scope="col">Strategy</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((example) => (
              <tr key={example.label}>
                <th scope="row">{example.label}</th>
                <td>
                  <code>{example.request.url}</code>
                </td>
                <td data-testid={`strategy-${example.request.url}`}>
                  {strategyFor(example.request, window.location.origin)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note">
          Only the two hashed files are cached. That is not conservatism: a hashed name cannot go
          stale, and nothing else in the list is safe to serve from disk.
        </p>
      </section>

      <section className="stack">
        <h3>Register it</h3>
        <div className="row">
          <button type="button" onClick={() => void register()} data-testid="register">
            Register the service worker
          </button>
          <button type="button" onClick={() => void inspectManifest()} data-testid="check-manifest">
            Check the manifest
          </button>
        </div>

        <pre className="log" data-testid="registration">
          {outcome === null
            ? "—"
            : outcome.ok
              ? `registered, scope ${outcome.scope}`
              : `not registered: ${outcome.reason}${outcome.detail === undefined ? "" : `\n${outcome.detail}`}`}
        </pre>

        <pre className="log" data-testid="manifest">
          {manifest === null
            ? "—"
            : manifest.ok
              ? "installable: every required field is present"
              : manifest.problems.join("\n")}
        </pre>

        <p className="note">
          Then open DevTools, Application, Service Workers, tick “Offline”, and reload. The shell
          comes back from disk. Untick it when you are done, or you will spend twenty minutes
          wondering why your API is down.
        </p>
      </section>
    </div>
  );
}
