/**
 * The decisions a service worker makes, as pure functions.
 *
 * `public/sw.js` runs in a worker with its own global scope, no DOM and no
 * module system worth relying on, which makes it awkward to test directly. The
 * logic worth testing is not the plumbing anyway: it is which strategy a
 * request gets and which caches to delete on activate. Both are pure, so they
 * live here and the worker mirrors them.
 *
 * Mirrored rather than imported, deliberately, and the test asserts the two
 * agree. A service worker is its own bundle entry with its own constraints,
 * and wiring it into the app's module graph to share four lines is a worse
 * trade than a test that fails when they drift.
 */

export type CacheStrategy = "cache-first" | "network-first" | "network-only";

export type RequestLike = {
  url: string;
  /** "navigate" for a page load, "cors"/"no-cors"/"same-origin" for the rest. */
  mode?: string;
  method?: string;
};

/**
 * Matches Vite's output: a name, a dash, a content hash, an extension.
 *
 * Exported so the test can check that `public/sw.js` carries the identical
 * pattern. The worker cannot import it, so the two are mirrored, and mirrored
 * code drifts unless something is watching.
 */
export const HASHED_ASSET = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/;

/**
 * Where a request's answer should come from.
 *
 * The rule is the same one the nginx config in lesson 07 applies, for the same
 * reason:
 *
 *   A hashed filename can never be stale, because changing the bytes changes
 *   the name. So cache it forever and never revalidate.
 *
 *   index.html has no hash and points at the hashed files. Serve a cached one
 *   and you pin a user to a deploy whose assets may already be deleted, which
 *   is a white screen that clears up on its own hours later and is impossible
 *   to reproduce.
 *
 *   Everything else is network-only. The most common service worker bug is an
 *   API response cached by accident, which arrives as a bug report about data
 *   that will not update.
 */
export function strategyFor(request: RequestLike, origin: string): CacheStrategy {
  // A cached POST is meaningless, and `cache.put` throws on one.
  if (request.method !== undefined && request.method !== "GET") return "network-only";

  if (request.mode === "navigate") return "network-first";

  let url: URL;
  try {
    url = new URL(request.url, origin);
  } catch {
    return "network-only";
  }

  // Someone else's server. Caching it is their decision to make, via headers.
  if (url.origin !== origin) return "network-only";
  if (url.pathname.startsWith("/api/")) return "network-only";
  if (HASHED_ASSET.test(url.pathname)) return "cache-first";

  return "network-only";
}

/**
 * Which caches to delete when a new worker activates.
 *
 * Skip this and every deploy leaves another full copy of the app on the user's
 * disk, until the browser evicts the origin entirely and they lose everything
 * including the data you did mean to keep.
 */
export function staleCacheNames(existing: readonly string[], version: string): string[] {
  return existing.filter((name) => !name.endsWith(version));
}

export type ManifestCheck = { ok: boolean; problems: string[] };

/**
 * The manifest fields that decide whether a browser offers to install the app.
 *
 * Getting one wrong produces no error. The install prompt simply never
 * appears, and you are left guessing which of the requirements you missed.
 */
export function checkManifest(manifest: Record<string, unknown>): ManifestCheck {
  const problems: string[] = [];

  if (typeof manifest["name"] !== "string" || manifest["name"] === "") {
    problems.push("name is required");
  }
  if (typeof manifest["short_name"] !== "string" || manifest["short_name"] === "") {
    problems.push("short_name is what shows under the icon");
  }
  if (manifest["start_url"] !== "/" && typeof manifest["start_url"] !== "string") {
    problems.push("start_url is required");
  }

  const display = manifest["display"];
  if (display !== "standalone" && display !== "fullscreen" && display !== "minimal-ui") {
    problems.push("display must be standalone, fullscreen or minimal-ui to be installable");
  }

  const icons = manifest["icons"];
  if (!Array.isArray(icons) || icons.length === 0) {
    problems.push("at least one icon is required");
  } else {
    // A maskable icon is what stops Android cropping a circle out of the
    // middle of a square logo.
    const hasMaskable = icons.some(
      (icon: unknown) =>
        typeof icon === "object" &&
        icon !== null &&
        typeof (icon as { purpose?: unknown }).purpose === "string" &&
        ((icon as { purpose: string }).purpose.split(/\s+/).includes("maskable") as boolean),
    );
    if (!hasMaskable) problems.push("no maskable icon: Android will crop the square one");
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Registration, and the three conditions people trip over.
 *
 * A secure context is required, and `localhost` counts as one, which is why
 * this works in development and then does not on a staging box served over
 * plain http.
 */
export type RegistrationOutcome =
  | { ok: true; scope: string }
  | { ok: false; reason: "unsupported" | "insecure" | "failed"; detail?: string };

export async function registerServiceWorker(
  path = "/sw.js",
  scope: { isSecureContext: boolean; navigator: Navigator } = globalThis as unknown as {
    isSecureContext: boolean;
    navigator: Navigator;
  },
): Promise<RegistrationOutcome> {
  if (!("serviceWorker" in scope.navigator)) return { ok: false, reason: "unsupported" };
  if (!scope.isSecureContext) return { ok: false, reason: "insecure" };

  try {
    const registration = await scope.navigator.serviceWorker.register(path, { type: "module" });
    return { ok: true, scope: registration.scope };
  } catch (error) {
    // A 404 on the worker file, a syntax error inside it, or a MIME type the
    // browser refuses. All three are silent unless you look here.
    return { ok: false, reason: "failed", detail: String(error) };
  }
}
