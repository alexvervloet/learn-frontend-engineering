/**
 * fetch, AbortController, and the stale-response bug
 * =================================================
 * Fire a request per keystroke and the responses come back in whatever order
 * the network feels like. Type "re", then "react": if "re" is slow and "react"
 * is fast, the results for "re" land last and overwrite the correct ones. The
 * UI now shows an answer to a question the user stopped asking.
 *
 * Nothing about this is exotic. It is the single most common bug in
 * hand-written data fetching, and it is why `useEffect` cleanup exists and why
 * TanStack Query is worth the dependency.
 *
 * Two fixes, both shown here:
 *
 *   AbortController  cancel the previous request. The old one never resolves,
 *                    so it cannot overwrite anything. It also stops the work
 *                    server-side if the server bothers to check.
 *   Sequence number  ignore any response that is not the newest. Cheaper, but
 *                    the wasted request still runs to completion.
 *
 * Prefer abort. Use a sequence number when you cannot cancel the work, which
 * is more often than it sounds: a `postMessage` round trip to a worker, an
 * SDK that hands you a promise and no handle, a cache read you would rather
 * not abandon halfway. The two also compose, and in a real client they
 * usually do, because a sequence check costs one comparison and protects you
 * from the one request that got away.
 *
 * `search` below is a stand-in server so the lesson runs offline. It takes a
 * signal and rejects with an AbortError exactly like `fetch` does.
 */
import { must, type Lesson } from "../types";

const CORPUS = ["react", "reactive", "reducer", "ref", "render", "resume", "rewrite"];

export class AbortError extends Error {
  override name = "AbortError";
}

/** A fake endpoint. Short queries are slow, which is what makes races visible. */
export function search(query: string, signal?: AbortSignal): Promise<string[]> {
  const latency = query.length <= 2 ? 900 : 120;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError("aborted before it started"));
      return;
    }

    const timer = setTimeout(() => {
      resolve(CORPUS.filter((word) => word.startsWith(query)));
    }, latency);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AbortError("aborted"));
      },
      // once: true, for the case this demo does not have.
      //
      // Here every request gets its own controller, so when the request
      // settles the controller, the signal and this listener all become
      // unreachable together and nothing accumulates. `once` changes
      // nothing.
      //
      // It matters the moment a signal outlives one request: a controller
      // held for a whole page, or `AbortSignal.timeout()` shared across
      // several calls. Then every request adds a listener to the same
      // signal and none of them is ever removed, because a listener added
      // without `once` is only removed by removing it. That is a leak that
      // grows with traffic and is invisible until it is not.
      { once: true },
    );
  });
}

/**
 * Runs a list of queries the way a naive keystroke handler would: no
 * cancellation, last write wins. Returns what the UI would be showing when the
 * dust settles.
 */
export async function raceUnguarded(queries: readonly string[]): Promise<string[]> {
  let shown: string[] = [];

  await Promise.all(
    queries.map(async (query) => {
      const results = await search(query);
      shown = results;
    }),
  );

  return shown;
}

/** The same list, with every superseded request aborted. */
export async function raceWithAbort(queries: readonly string[]): Promise<string[]> {
  let shown: string[] = [];
  let controller: AbortController | null = null;

  await Promise.all(
    queries.map(async (query) => {
      controller?.abort();
      const own = new AbortController();
      controller = own;

      try {
        shown = await search(query, own.signal);
      } catch (error) {
        // An abort is the expected outcome, not a failure. Reporting it to the
        // user as an error is a bug people ship constantly.
        if (error instanceof Error && error.name === "AbortError") return;
        throw error;
      }
    }),
  );

  return shown;
}

/**
 * The same list again, guarded by a counter instead of a cancellation.
 *
 * Every request still runs to completion and every response still arrives.
 * The difference is that a response now has to prove it is the newest before
 * it is allowed to touch the UI, and a stale one is dropped on the floor.
 *
 * Read the two lines that matter together: `own` is claimed synchronously
 * when the request starts, `latest` keeps moving as later requests start, so
 * `own < latest` is exactly "something newer began while I was in flight".
 * The comparison has to happen *after* the await. Capturing the number before
 * and comparing before is a guard that is always true.
 */
export async function raceWithSequence(queries: readonly string[]): Promise<string[]> {
  let shown: string[] = [];
  let latest = 0;

  await Promise.all(
    queries.map(async (query) => {
      latest += 1;
      const own = latest;

      const results = await search(query);

      // The whole fix. Without this line the slow "re" lands last and wins.
      if (own < latest) return;

      shown = results;
    }),
  );

  return shown;
}

export function mountFetchRaces(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      <p class="note">
        Type <code>re</code>, then quickly finish the word <code>react</code>.
        Two-letter queries take 900ms here; longer ones take 120ms.
      </p>
      <label class="row">Unguarded <input id="bad" type="search" placeholder="type fast" /></label>
      <pre id="bad-out" class="log">—</pre>
      <label class="row">Aborted <input id="good" type="search" placeholder="type fast" /></label>
      <pre id="good-out" class="log">—</pre>
      <label class="row">Sequenced <input id="seq" type="search" placeholder="type fast" /></label>
      <pre id="seq-out" class="log">—</pre>
      <p class="note">
        The bottom two end up in the same place by different routes. Watch the counter:
        the sequenced one keeps answering requests it then throws away, which is the work
        abort would have saved.
      </p>
    </div>
  `;

  const bad = must<HTMLInputElement>(root, "#bad");
  const good = must<HTMLInputElement>(root, "#good");
  const badOut = must<HTMLPreElement>(root, "#bad-out");
  const goodOut = must<HTMLPreElement>(root, "#good-out");
  const seq = must<HTMLInputElement>(root, "#seq");
  const seqOut = must<HTMLPreElement>(root, "#seq-out");

  async function onBadInput(): Promise<void> {
    const query = bad.value;
    const results = await search(query);
    badOut.textContent = `query "${query}" → ${results.join(", ") || "(none)"}`;
  }

  let controller: AbortController | null = null;

  async function onGoodInput(): Promise<void> {
    controller?.abort();
    const own = new AbortController();
    controller = own;

    const query = good.value;
    try {
      const results = await search(query, own.signal);
      goodOut.textContent = `query "${query}" → ${results.join(", ") || "(none)"}`;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      throw error;
    }
  }

  let latest = 0;
  let discarded = 0;

  async function onSeqInput(): Promise<void> {
    latest += 1;
    const own = latest;

    const query = seq.value;
    const results = await search(query);

    // Nothing was cancelled, so this response definitely arrived. It just
    // does not get to be the answer.
    if (own < latest) {
      discarded += 1;
      seqOut.textContent = `${seqOut.textContent ?? ""}\n(dropped a stale answer for "${query}", ${discarded} so far)`;
      return;
    }

    seqOut.textContent = `query "${query}" → ${results.join(", ") || "(none)"}`;
  }

  bad.addEventListener("input", onBadInput);
  good.addEventListener("input", onGoodInput);
  seq.addEventListener("input", onSeqInput);

  return () => {
    controller?.abort();
    bad.removeEventListener("input", onBadInput);
    good.removeEventListener("input", onGoodInput);
    seq.removeEventListener("input", onSeqInput);
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "fetch-and-races",
  title: "fetch, abort, and stale responses",
  summary:
    "A slow earlier request overwrites a fast later one unless you cancel it, or refuse to believe it.",
  file: "src/lessons/03_fetch_and_races.ts",
  mount: mountFetchRaces,
};
