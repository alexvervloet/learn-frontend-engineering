/**
 * Where a browser can put things, and what each place costs
 * ========================================================
 * Five mechanisms, and the choice between them is nearly always made on one
 * of three axes rather than on the API:
 *
 *   how much fits          4KB for a cookie, ~5MB for localStorage, hundreds
 *                          of MB for IndexedDB
 *   what it costs to read  localStorage and cookies are synchronous and block
 *                          the main thread; IndexedDB and Cache Storage do not
 *   who else can read it   anything on your origin can read all of them except
 *                          an HttpOnly cookie
 *
 * `MECHANISMS` below is that comparison as data rather than as a paragraph, so
 * the tests can hold it to what the adapters underneath it actually do.
 *
 * Two things people get wrong:
 *
 * **localStorage is synchronous.** Every read and write blocks the main thread,
 * including the JSON parse. Storing a large object and reading it on every
 * render is a measurable jank source, and the demo will time it for you.
 *
 * **"Never put a token in localStorage" is half of a sentence.** The real point
 * is that any XSS on your origin can read localStorage, so a token there is
 * stealable by injected script. An `HttpOnly` cookie is not readable by script
 * at all, which is why it is the better place, at the cost of having to defend
 * against CSRF instead. If you have XSS you have a serious problem either way.
 * The production module covers the trade in full.
 *
 * `safeLocalStorage` is worth copying. Storage throws in Safari private mode
 * and when the quota is full, and an uncaught throw on a read is an entirely
 * avoidable white screen.
 */
import { must, type Lesson } from "../types";

export type MechanismName =
  "cookie" | "localStorage" | "sessionStorage" | "indexedDB" | "cacheStorage";

export type Mechanism = {
  name: MechanismName;
  /** Order of magnitude, not a promise. Every browser sets its own limits. */
  capacity: string;
  /** Synchronous storage blocks the main thread on every read and write. */
  synchronous: boolean;
  /** Attached to matching requests by the browser, with no code involved. */
  sentWithRequests: boolean;
  /** Can a script on this origin read it? `false` only for an HttpOnly cookie. */
  readableByScript: boolean;
  /** Structured clone, or strings only. */
  storesNonStrings: boolean;
  use: string;
};

export const MECHANISMS: readonly Mechanism[] = [
  {
    name: "cookie",
    capacity: "~4KB per cookie",
    synchronous: true,
    sentWithRequests: true,
    // From JavaScript's side of the fence. An HttpOnly cookie is invisible
    // here, which is the entire reason to use one, and also the reason
    // `readCookie` below cannot tell you whether one exists.
    readableByScript: true,
    storesNonStrings: false,
    use: "Anything the server has to see on the request that carries it. Sessions, above all.",
  },
  {
    name: "localStorage",
    capacity: "~5MB per origin",
    synchronous: true,
    sentWithRequests: false,
    readableByScript: true,
    storesNonStrings: false,
    use: "Small preferences that should survive a close. Theme, last-used filter, a dismissed banner.",
  },
  {
    name: "sessionStorage",
    capacity: "~5MB per tab",
    synchronous: true,
    sentWithRequests: false,
    readableByScript: true,
    storesNonStrings: false,
    use: "The same, for one tab only. A multi-step form's progress, so two tabs do not collide.",
  },
  {
    name: "indexedDB",
    capacity: "hundreds of MB, quota-based",
    synchronous: false,
    sentWithRequests: false,
    readableByScript: true,
    storesNonStrings: true,
    use: "Real amounts of data, and anything that is not a string. Blobs, files, an offline record set.",
  },
  {
    name: "cacheStorage",
    capacity: "shares the same quota as IndexedDB",
    synchronous: false,
    sentWithRequests: false,
    readableByScript: true,
    storesNonStrings: true,
    use: "Whole HTTP responses, keyed by request. What a service worker serves offline from.",
  },
];

export function mechanism(name: MechanismName): Mechanism {
  const found = MECHANISMS.find((entry) => entry.name === name);
  if (found === undefined) throw new Error(`unknown mechanism: ${name}`);
  return found;
}

/* ------------------------------------------------------------------ *
 * localStorage and sessionStorage: one API, two lifetimes
 * ------------------------------------------------------------------ */

export type StorageResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export function readJson<T>(storage: Storage, key: string): StorageResult<T> {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    // Safari in private mode, or storage disabled by policy.
    return { ok: false, reason: `storage unavailable: ${String(error)}` };
  }

  if (raw === null) return { ok: false, reason: "missing" };

  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    // Someone shipped a different shape under this key, or a half-written
    // value. Treat it as missing rather than crashing on every load forever.
    return { ok: false, reason: "corrupt JSON" };
  }
}

export function writeJson(storage: Storage, key: string, value: unknown): StorageResult<null> {
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true, value: null };
  } catch (error) {
    // QuotaExceededError. Not hypothetical: 5MB goes fast if you cache API
    // responses here.
    return { ok: false, reason: String(error) };
  }
}

/** Measures how long a synchronous write actually takes at a given size. */
export function timeWrite(storage: Storage, key: string, sizeInKb: number): number {
  const payload = { blob: "x".repeat(sizeInKb * 1024) };
  const started = performance.now();
  writeJson(storage, key, payload);
  const elapsed = performance.now() - started;
  storage.removeItem(key);
  return elapsed;
}

/* ------------------------------------------------------------------ *
 * Cookies: a string pretending to be a map
 * ------------------------------------------------------------------ */

/**
 * `document.cookie` is the strangest API on the platform. Reading it gives
 * every cookie for the page as one `name=value; name=value` string.
 * *Assigning* to it sets a single cookie rather than replacing the lot,
 * which is why `document.cookie = "a=1"` does not wipe out `b`.
 *
 * Three things the getter cannot tell you, and they are the three that
 * matter: whether a cookie is `HttpOnly` (if it is, it is not in the string
 * at all), when it expires, and which path or domain it is scoped to. The
 * string is names and values, nothing else. If your code needs to know
 * whether a session is still valid, ask the server.
 */
export function parseCookies(header: string): Record<string, string> {
  const jar: Record<string, string> = {};

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed === "") continue;

    // Split on the first "=" only. A value may legitimately contain one, and
    // splitting on all of them silently truncates it.
    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const name = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim();
    if (name === "") continue;

    try {
      jar[name] = decodeURIComponent(value);
    } catch {
      // A stray "%" that is not an escape. Better the raw value than a throw
      // on every page load for the life of the cookie.
      jar[name] = value;
    }
  }

  return jar;
}

export function readCookie(name: string): string | null {
  return parseCookies(document.cookie)[name] ?? null;
}

export type CookieOptions = {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: "Strict" | "Lax" | "None";
};

/**
 * Builds the assignment rather than performing it, so the attributes can be
 * asserted. Note what is missing: `HttpOnly` and `Secure` are server-side
 * attributes on a `Set-Cookie` header. A cookie written from JavaScript can
 * never be HttpOnly, by definition, because the script that wrote it could
 * read it back.
 */
export function cookieAssignment(name: string, value: string, options: CookieOptions = {}): string {
  const { maxAgeSeconds, path = "/", sameSite = "Lax" } = options;

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${String(maxAgeSeconds)}`);

  return parts.join("; ");
}

export function writeCookie(name: string, value: string, options: CookieOptions = {}): void {
  document.cookie = cookieAssignment(name, value, options);
}

export function deleteCookie(name: string, path = "/"): void {
  // There is no delete. You overwrite it with one that has already expired,
  // and the path has to match the one it was set with or you get two cookies.
  document.cookie = `${name}=; Path=${path}; Max-Age=0`;
}

/* ------------------------------------------------------------------ *
 * IndexedDB: asynchronous, structured, and much larger
 * ------------------------------------------------------------------ */

/**
 * IndexedDB's own API is event-based and from another era: you open a
 * database, wait for `onupgradeneeded`, start a transaction, and every
 * request is an object with `onsuccess` and `onerror` on it. In an app you
 * would use `idb` and never see any of it.
 *
 * It is worth wrapping once by hand anyway, because the shape underneath
 * explains the two things that surprise people. Transactions auto-close the
 * moment you stop using them, so an `await` on anything else in the middle of
 * one will kill it. And `onupgradeneeded` is the only place a store can be
 * created, which is why the version number is part of the open call.
 */
const DB_NAME = "web-fundamentals";
const STORE = "kv";

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export type KeyValueStore = {
  get: <T>(key: string) => Promise<T | undefined>;
  set: (key: string, value: unknown) => Promise<void>;
  remove: (key: string) => Promise<void>;
  keys: () => Promise<string[]>;
  close: () => void;
};

export async function openKeyValueStore(name = DB_NAME): Promise<KeyValueStore> {
  const open = indexedDB.open(name, 1);

  // The only moment a store may be created. Miss it and every later
  // transaction throws NotFoundError.
  open.onupgradeneeded = () => {
    if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
  };

  const db = await promisify(open);

  function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>) {
    // Nothing is awaited between opening the transaction and issuing the
    // request, deliberately. A transaction closes as soon as the task that
    // created it yields with no requests outstanding.
    const transaction = db.transaction(STORE, mode);
    return promisify(body(transaction.objectStore(STORE)));
  }

  return {
    get: <T>(key: string) => run<T>("readonly", (store) => store.get(key) as IDBRequest<T>),
    set: async (key, value) => {
      // Structured clone, not JSON. A Date stays a Date, a Blob stays a Blob,
      // and a circular reference is fine. A function is not.
      await run("readwrite", (store) => store.put(value, key));
    },
    remove: async (key) => {
      await run("readwrite", (store) => store.delete(key));
    },
    keys: async () => {
      const found = await run<IDBValidKey[]>("readonly", (store) => store.getAllKeys());
      return found.map(String);
    },
    close: () => db.close(),
  };
}

/* ------------------------------------------------------------------ *
 * Cache Storage: whole responses, keyed by request
 * ------------------------------------------------------------------ */

/**
 * The store a service worker serves from when the network is gone. It holds
 * `Response` objects keyed by `Request`, so what comes back out is the thing
 * `fetch` would have returned, headers and all.
 *
 * It is available on the window as well as in a worker, which makes it easy
 * to try. jsdom does not implement it, so the test for this asserts the
 * feature detection and nothing more; the behaviour is proved against a real
 * browser in `learning/production/e2e/offline.spec.ts`, which registers a
 * service worker, precaches the shell, and switches the network off.
 */
export function hasCacheStorage(): boolean {
  return typeof globalThis.caches !== "undefined";
}

export async function cacheFirst(cacheName: string, request: string): Promise<Response> {
  if (!hasCacheStorage()) throw new Error("Cache Storage is not available here");

  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit !== undefined) return hit;

  const response = await fetch(request);
  // Clone before storing. A Response body is a stream and can be read once,
  // so putting the original in the cache leaves the caller an empty one.
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/* ------------------------------------------------------------------ *
 * The demo
 * ------------------------------------------------------------------ */

function comparisonTable(): string {
  const rows = MECHANISMS.map(
    (entry) => `
      <tr>
        <th scope="row"><code>${entry.name}</code></th>
        <td>${entry.capacity}</td>
        <td>${entry.synchronous ? "blocks" : "async"}</td>
        <td>${entry.sentWithRequests ? "yes" : "no"}</td>
        <td>${entry.storesNonStrings ? "anything" : "strings"}</td>
      </tr>`,
  ).join("");

  return `
    <table class="compare">
      <caption>The same table the tests assert against.</caption>
      <thead>
        <tr><th scope="col">Where</th><th scope="col">How much</th><th scope="col">Read cost</th>
        <th scope="col">Sent to the server</th><th scope="col">Stores</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function mountStorage(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      ${comparisonTable()}

      <h3>Write the same note to four of them</h3>
      <div class="row">
        <input id="note" placeholder="type a note" />
        <button id="save">Save</button>
        <button id="clear">Clear</button>
      </div>
      <p class="note">
        Reload: the cookie and localStorage copies come back. Open a new tab: the
        sessionStorage one is missing, because that is what "session" means here.
      </p>
      <pre id="out" class="log">—</pre>

      <h3>What a synchronous write costs</h3>
      <div class="row">
        <button id="bench">Time a 1MB localStorage write</button>
        <button id="bench-idb">Time the same write to IndexedDB</button>
      </div>
      <pre id="bench-out" class="log">—</pre>

      <h3>Cache Storage</h3>
      <div class="row"><button id="cache">Fetch this page twice</button></div>
      <pre id="cache-out" class="log">—</pre>
    </div>
  `;

  const KEY = "web-fundamentals:note";
  const note = must<HTMLInputElement>(root, "#note");
  const out = must<HTMLPreElement>(root, "#out");
  const benchOut = must<HTMLPreElement>(root, "#bench-out");
  const cacheOut = must<HTMLPreElement>(root, "#cache-out");
  const save = must<HTMLButtonElement>(root, "#save");
  const clear = must<HTMLButtonElement>(root, "#clear");
  const bench = must<HTMLButtonElement>(root, "#bench");
  const benchIdb = must<HTMLButtonElement>(root, "#bench-idb");
  const cacheButton = must<HTMLButtonElement>(root, "#cache");

  let store: KeyValueStore | null = null;
  const storeReady = openKeyValueStore()
    .then((opened) => (store = opened))
    .catch(() => null);

  async function show(): Promise<void> {
    const local = readJson<string>(localStorage, KEY);
    const session = readJson<string>(sessionStorage, KEY);
    await storeReady;
    const fromDb = await store?.get<string>(KEY);

    out.textContent = [
      `cookie         ${readCookie("note") ?? "—"}`,
      `localStorage   ${local.ok ? local.value : `— (${local.reason})`}`,
      `sessionStorage ${session.ok ? session.value : `— (${session.reason})`}`,
      `indexedDB      ${fromDb ?? "—"}`,
    ].join("\n");
  }

  function onSave(): void {
    writeCookie("note", note.value, { maxAgeSeconds: 60 * 60 });
    writeJson(localStorage, KEY, note.value);
    writeJson(sessionStorage, KEY, note.value);
    void store?.set(KEY, note.value).then(show);
    void show();
  }

  function onClear(): void {
    deleteCookie("note");
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
    void store?.remove(KEY).then(show);
    void show();
  }

  function onBench(): void {
    const ms = timeWrite(localStorage, "web-fundamentals:bench", 1024);
    benchOut.textContent =
      `1MB write blocked the main thread for ${ms.toFixed(1)}ms.\n` +
      `A frame is 16.7ms, so that is roughly ${String(Math.round(ms / 16.7))} dropped frames.`;
  }

  async function onBenchIdb(): Promise<void> {
    await storeReady;
    if (store === null) {
      benchOut.textContent = "IndexedDB is not available here.";
      return;
    }

    const payload = "x".repeat(1024 * 1024);
    const started = performance.now();
    await store.set("web-fundamentals:bench", payload);
    const elapsed = performance.now() - started;
    await store.remove("web-fundamentals:bench");

    benchOut.textContent =
      `The same 1MB took ${elapsed.toFixed(1)}ms of wall clock in IndexedDB,\n` +
      `but almost none of it on the main thread. Compare the spinner in lesson 02:\n` +
      `wall clock is not the number that drops frames.`;
  }

  async function onCache(): Promise<void> {
    if (!hasCacheStorage()) {
      cacheOut.textContent =
        "No Cache Storage here. It needs a secure context, so http on a\n" +
        "non-localhost host does not get it either.";
      return;
    }

    const url = window.location.pathname;
    const first = performance.now();
    await cacheFirst("web-fundamentals", url);
    const miss = performance.now() - first;

    const second = performance.now();
    await cacheFirst("web-fundamentals", url);
    const hit = performance.now() - second;

    cacheOut.textContent =
      `network + store  ${miss.toFixed(1)}ms\n` +
      `from the cache   ${hit.toFixed(1)}ms\n\n` +
      `The second one never touched the network. A service worker does this for\n` +
      `every request, which is how an offline app works.`;
  }

  save.addEventListener("click", onSave);
  clear.addEventListener("click", onClear);
  bench.addEventListener("click", onBench);
  benchIdb.addEventListener("click", onBenchIdb);
  cacheButton.addEventListener("click", onCache);
  void show();

  return () => {
    save.removeEventListener("click", onSave);
    clear.removeEventListener("click", onClear);
    bench.removeEventListener("click", onBench);
    benchIdb.removeEventListener("click", onBenchIdb);
    cacheButton.removeEventListener("click", onCache);
    store?.close();
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "storage",
  title: "Cookies, localStorage, IndexedDB and the rest",
  summary: "Five places to put data, each with a different size, thread cost, and XSS exposure.",
  file: "src/lessons/04_storage.ts",
  mount: mountStorage,
};
