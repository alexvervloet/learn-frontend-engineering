/**
 * Where a browser can put things, and what each place costs
 * ========================================================
 *
 *   Cookie          ~4KB, sent on every matching request, readable by JS unless
 *                   HttpOnly. The only option the server can set and read back.
 *   localStorage    ~5MB, synchronous, survives a close, origin-scoped,
 *                   readable by any script on the page.
 *   sessionStorage  same API, cleared when the tab closes, not shared between tabs.
 *   IndexedDB       hundreds of MB, asynchronous, structured, stores Blobs.
 *   Cache Storage   HTTP responses, what a service worker serves offline from.
 *
 * Two things people get wrong:
 *
 * **localStorage is synchronous.** Every read and write blocks the main thread,
 * including the JSON parse. Storing a large object and reading it on every
 * render is a measurable jank source.
 *
 * **"Never put a token in localStorage" is half of a sentence.** The real point
 * is that any XSS on your origin can read localStorage, so a token there is
 * stealable by injected script. An `HttpOnly` cookie is not readable by script
 * at all, which is why it is the better place, at the cost of having to defend
 * against CSRF instead. If you have XSS you have a serious problem either way.
 * The production module covers the trade in full.
 *
 * `safeLocalStorage` below is worth copying. Storage throws in Safari private
 * mode and when the quota is full, and an uncaught throw on a read is an
 * entirely avoidable white screen.
 */
import { must, type Lesson } from "../types";

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

export function mountStorage(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      <div class="row">
        <input id="note" placeholder="type a note" />
        <button id="save">Save to localStorage</button>
        <button id="clear">Clear</button>
      </div>
      <p class="note">Reload the page: the note comes back. Open a new tab: it is there too.</p>
      <pre id="out" class="log">—</pre>
      <div class="row">
        <button id="bench">Time a 1MB synchronous write</button>
      </div>
      <pre id="bench-out" class="log">—</pre>
    </div>
  `;

  const KEY = "web-fundamentals:note";
  const note = must<HTMLInputElement>(root, "#note");
  const out = must<HTMLPreElement>(root, "#out");
  const benchOut = must<HTMLPreElement>(root, "#bench-out");
  const save = must<HTMLButtonElement>(root, "#save");
  const clear = must<HTMLButtonElement>(root, "#clear");
  const bench = must<HTMLButtonElement>(root, "#bench");

  function show(): void {
    const result = readJson<string>(localStorage, KEY);
    out.textContent = result.ok
      ? `stored: ${JSON.stringify(result.value)}`
      : `nothing (${result.reason})`;
  }

  function onSave(): void {
    const result = writeJson(localStorage, KEY, note.value);
    if (!result.ok) out.textContent = `write failed: ${result.reason}`;
    else show();
  }

  function onClear(): void {
    localStorage.removeItem(KEY);
    show();
  }

  function onBench(): void {
    const ms = timeWrite(localStorage, "web-fundamentals:bench", 1024);
    benchOut.textContent =
      `1MB write blocked the main thread for ${ms.toFixed(1)}ms.\n` +
      `A frame is 16.7ms, so that is roughly ${Math.round(ms / 16.7)} dropped frames.`;
  }

  save.addEventListener("click", onSave);
  clear.addEventListener("click", onClear);
  bench.addEventListener("click", onBench);
  show();

  return () => {
    save.removeEventListener("click", onSave);
    clear.removeEventListener("click", onClear);
    bench.removeEventListener("click", onBench);
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "storage",
  title: "Cookies, localStorage, and IndexedDB",
  summary: "Five places to put data, each with a different size, thread cost, and XSS exposure.",
  file: "src/lessons/04_storage.ts",
  mount: mountStorage,
};
