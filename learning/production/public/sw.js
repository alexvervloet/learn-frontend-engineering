/* eslint-disable no-undef */
/**
 * A service worker, written out rather than generated.
 *
 * Workbox and vite-plugin-pwa produce a better one than this and you should
 * use them. The reason to write eighty lines by hand first is that a generated
 * service worker is the single easiest thing in frontend to ship, forget, and
 * then spend a day debugging, because it sits between every request your app
 * makes and the network, it outlives the page that installed it, and a bad one
 * is cached on your users' machines until they clear site data.
 *
 * Three phases, and each has one thing that catches people out.
 *
 *   install    Precache the shell. `skipWaiting()` makes the new worker take
 *              over immediately instead of waiting for every tab to close. That
 *              is what you usually want and it is not the default, because
 *              swapping the worker under a running page can hand it assets
 *              from a different build.
 *   activate   Delete caches from older versions. Skip this and every deploy
 *              leaves another copy of the app on disk forever.
 *              `clients.claim()` takes control of pages that are already open.
 *   fetch      Decide, per request, where the answer comes from.
 *
 * The strategy split below is the important part, and it is the same rule as
 * the nginx config in lesson 07:
 *
 *   hashed assets   cache first. The filename contains a content hash, so a
 *                   cached one can never be stale. This is the whole reason
 *                   for hashed filenames.
 *   navigations     network first, falling back to the cached shell. Serve a
 *                   cached index.html and you pin users to an old deploy whose
 *                   asset URLs may no longer exist.
 *   everything else network only. An API response cached by accident is a bug
 *                   report about data that will not update.
 */

// Bump this to invalidate everything. In a real build it is the commit SHA,
// injected at build time, so a deploy rotates it without anyone remembering.
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;

const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll is atomic: one 404 and the whole install fails, which is the
      // behaviour you want. A partially precached shell is worse than none.
      await cache.addAll(SHELL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = names.filter((name) => !name.endsWith(VERSION));
      await Promise.all(stale.map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

/** Which strategy a request gets. Kept in sync with src/lib/offline.ts. */
function strategyFor(request) {
  if (request.mode === "navigate") return "network-first";
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return "network-only";
  if (url.pathname.startsWith("/api/")) return "network-only";
  if (/\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname)) return "cache-first";
  return "network-only";
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    // Clone before storing: a Response body is a stream and reads once, so
    // caching the original hands the page an empty one.
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put("/index.html", response.clone());
    }
    return response;
  } catch {
    // Offline. The cached shell boots the app, which then has to cope with
    // having no data, which is the other half of the work.
    const cached = await caches.match("/index.html");
    if (cached) return cached;
    throw new Error("offline and nothing cached");
  }
}

self.addEventListener("fetch", (event) => {
  // GET only. A cached POST is meaningless and `cache.put` throws on one.
  if (event.request.method !== "GET") return;

  const strategy = strategyFor(event.request);
  if (strategy === "network-only") return;

  event.respondWith(
    strategy === "cache-first" ? cacheFirst(event.request) : networkFirst(event.request),
  );
});
