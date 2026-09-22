/// <reference lib="webworker" />

/**
 * The worker half. A separate file because it is a separate thread.
 *
 * Nothing in here can touch the page. There is no `document`, no `window`, no
 * `localStorage`, and reaching for one is a ReferenceError rather than a
 * warning. What it has is `self`, `postMessage`, `fetch`, timers, IndexedDB
 * and the rest of the worker-safe platform.
 *
 * Note what is *not* here: any state about who asked. The worker answers
 * whatever arrives and stamps the reply with the id it was given. Pairing a
 * reply to a request is the caller's job, and `05_workers.ts` is mostly about
 * why that is the part people get wrong.
 */
import { countPrimesBelow, type WorkRequest, type WorkResponse } from "./05_workers";

self.addEventListener("message", (event: MessageEvent<WorkRequest>) => {
  const { id, limit } = event.data;

  try {
    const reply: WorkResponse = { id, ok: true, primes: countPrimesBelow(limit) };
    self.postMessage(reply);
  } catch (error) {
    // An exception in here does not reach the page's error handler by itself.
    // Unhandled, it fires an `error` event on the worker object and the
    // caller's promise hangs forever. Catch it and send it back as a value.
    const reply: WorkResponse = {
      id,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
  }
});
