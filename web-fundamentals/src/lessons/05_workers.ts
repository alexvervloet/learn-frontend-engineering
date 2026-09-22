/**
 * Web Workers: the only way to not block the main thread
 * ======================================================
 * Lesson 02 ends on a button that freezes the page for 1.5 seconds and a
 * paragraph saying that is what a dropped frame is made of. This is the answer
 * to it, and there is only one: move the work to another thread.
 *
 * Everything else people reach for is a way of *spreading* the work, not
 * removing it. `setTimeout(0)` between chunks, `requestIdleCallback`,
 * `scheduler.yield()`: all of them hand the main thread back often enough for
 * it to paint, which genuinely helps, and all of them still run your code on
 * the thread the user is trying to click on. A worker is the only option where
 * the work is somewhere else entirely.
 *
 * **What a worker is.** A second JavaScript thread with its own global scope,
 * its own memory, and no access to yours. No `document`, no `window`, no DOM.
 * It cannot render anything and it cannot read a variable you declared. The
 * two sides talk by passing messages, and that is the whole interface.
 *
 *   const worker = new Worker(new URL("./thing.worker.ts", import.meta.url), { type: "module" });
 *   worker.postMessage({ limit: 5_000_000 });
 *   worker.addEventListener("message", (event) => …);
 *
 * **Messages are copied, not shared.** `postMessage` uses the structured clone
 * algorithm: the receiving thread gets a deep copy. So it handles Maps, Sets,
 * Dates, typed arrays and cycles, and it throws on functions, DOM nodes and
 * class instances, which lose their prototype. The copy costs time
 * proportional to the size, and that cost is paid on the sending thread,
 * blocking it. Sending fifty megabytes to avoid blocking the main thread
 * blocks the main thread.
 *
 * For large binary data there is a way out: `postMessage(buffer, [buffer])`
 * *transfers* an ArrayBuffer instead of copying it. Ownership moves, the
 * sender's copy is detached and unusable afterwards, and it is O(1) rather
 * than O(size). `SharedArrayBuffer` shares memory outright, needs two COOP and
 * COEP headers to be enabled at all, and brings you every problem threads have
 * in other languages.
 *
 * **The bug this lesson is really about: `message` is not a reply.**
 *
 * A worker has one message channel, not a request-response pair. Fire two
 * jobs and you get two messages, in whatever order they finish, with nothing
 * on them to say which is which. The naive client resolves the first promise
 * with whichever answer lands first:
 *
 *   worker.onmessage = (event) => resolve(event.data);   // resolve *what*?
 *
 * That is lesson 03's stale-response bug again, in a different costume, and
 * it has the same shape of fix: put an id on the request, have the worker
 * stamp the reply with it, and look the caller up by id. `createWorkerClient`
 * below does that in about fifteen lines, and the test fires a slow job and a
 * fast job together to prove it.
 *
 * **Workers are not free.** Spawning one costs a few milliseconds and a few
 * megabytes, because it is a whole JavaScript context. One long-lived worker
 * reused for many jobs is the normal shape; one per click is not. If you want
 * parallelism across cores, a small pool sized to
 * `navigator.hardwareConcurrency` is the next step, and after that you want a
 * library rather than this file.
 *
 * **Terminate it.** `worker.terminate()` stops it immediately, mid-execution,
 * with no cleanup. A worker you forgot about is a thread and a heap that
 * outlive the component that started it, which is the same leak as lesson
 * 01's listener on `document` and is harder to see.
 *
 * **When it is worth it.** The round trip is a millisecond or two, so a
 * worker is wrong for small work. Parsing a large file, image or video
 * processing, crypto, a search index, a big diff, anything where you would
 * otherwise write "this will only take a moment". If the work is under about
 * 50ms, chunk it on the main thread instead: that is the INP threshold, and
 * the performance module has the numbers.
 *
 * The code below is split so that it can be tested without a browser. The
 * computation is a plain function, the protocol is a plain type, and the
 * client takes anything shaped like a worker. jsdom implements no Worker at
 * all, so the tests run the real protocol against a stand-in and the browser
 * runs the same protocol against a real thread.
 */
import { must, type Lesson } from "../types";

/** A request, with the id that makes the reply identifiable. */
export type WorkRequest = { id: number; limit: number };

/** A reply, carrying back the id it was asked with. */
export type WorkResponse =
  { id: number; ok: true; primes: number } | { id: number; ok: false; message: string };

/**
 * The work. Deliberately CPU-bound and deliberately not clever: a sieve would
 * be faster and would make the lesson about the sieve.
 *
 * It is a plain exported function for two reasons. The test can check it
 * without any threading at all, and the "blocking" button in the demo can run
 * the identical code on the main thread, so the comparison is between two
 * threads rather than between two implementations.
 */
export function countPrimesBelow(limit: number): number {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError(`limit must be a non-negative integer, got ${String(limit)}`);
  }

  let found = 0;

  for (let candidate = 2; candidate < limit; candidate += 1) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor += 1) {
      if (candidate % divisor === 0) {
        prime = false;
        break;
      }
    }
    if (prime) found += 1;
  }

  return found;
}

/**
 * The part of a `Worker` this client needs.
 *
 * Narrowing to a structural type rather than taking `Worker` is what makes the
 * protocol testable: jsdom has no Worker, and a test double only has to
 * implement these three methods. It is also honest about the coupling, which
 * is smaller than the class.
 */
export type WorkerLike = {
  postMessage(message: WorkRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<WorkResponse>) => void): void;
  terminate(): void;
};

export type WorkerClient = {
  /** Resolves with the answer to *this* request, whatever else is in flight. */
  run(limit: number): Promise<number>;
  /** How many jobs are still waiting. Zero after everything settles, or it leaks. */
  pending(): number;
  dispose(): void;
};

/**
 * Wraps a worker in something that returns promises, correlating replies by id.
 *
 * The map is the whole idea. Without it there is one channel and no way to
 * tell whose answer just arrived, so two overlapping jobs resolve each other's
 * promises and the bug only shows up when the second one happens to be faster.
 */
export function createWorkerClient(worker: WorkerLike): WorkerClient {
  type Waiting = { resolve: (value: number) => void; reject: (error: Error) => void };

  const waiting = new Map<number, Waiting>();
  let nextId = 0;

  function onMessage(event: MessageEvent<WorkResponse>): void {
    const reply = event.data;
    const caller = waiting.get(reply.id);

    // A reply with no caller is not an error worth throwing over: it happens
    // when a job settles after `dispose`. Dropping it is correct; resolving
    // something else with it is the bug.
    if (caller === undefined) return;

    // Delete before settling. A caller that starts another job from its `then`
    // would otherwise be deleted out of the map after it had re-registered.
    waiting.delete(reply.id);

    if (reply.ok) caller.resolve(reply.primes);
    else caller.reject(new Error(reply.message));
  }

  worker.addEventListener("message", onMessage);

  return {
    run(limit: number): Promise<number> {
      nextId += 1;
      const id = nextId;

      return new Promise<number>((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        worker.postMessage({ id, limit });
      });
    },

    pending: () => waiting.size,

    dispose(): void {
      worker.removeEventListener("message", onMessage);

      // Every promise still outstanding has to be settled. `terminate` kills
      // the thread mid-job, so those replies are never coming, and a promise
      // that never settles is an `await` that never returns.
      for (const [, caller] of waiting) {
        caller.reject(new Error("the worker was disposed before this finished"));
      }
      waiting.clear();

      worker.terminate();
    },
  };
}

/** The same work, on the main thread, for the button that freezes the page. */
function blockingRun(limit: number): number {
  return countPrimesBelow(limit);
}

export function mountWorkers(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      <p class="note">
        Both buttons count the primes below 300,000, which takes about a second. The
        spinner is a requestAnimationFrame loop: it paints once per frame, so it stops
        dead whenever the main thread is busy.
      </p>
      <p id="spinner" style="font-size:1.6rem">◐</p>
      <div class="row">
        <button id="block">Count on the main thread</button>
        <button id="worker">Count in a worker</button>
        <button id="both">Fire two jobs at once</button>
      </div>
      <pre id="out" class="log">Click a button and watch the spinner.</pre>
    </div>
  `;

  const out = must<HTMLPreElement>(root, "#out");
  const spinner = must<HTMLParagraphElement>(root, "#spinner");
  const blockButton = must<HTMLButtonElement>(root, "#block");
  const workerButton = must<HTMLButtonElement>(root, "#worker");
  const bothButton = must<HTMLButtonElement>(root, "#both");

  const frames = ["◐", "◓", "◑", "◒"];
  let frame = 0;
  let handle = requestAnimationFrame(function tick() {
    frame = (frame + 1) % frames.length;
    spinner.textContent = frames[frame] ?? "◐";
    handle = requestAnimationFrame(tick);
  });

  // `new URL(..., import.meta.url)` rather than a bare string. That exact
  // spelling is what lets the bundler find the file, give it its own chunk and
  // rewrite the path for the build. A variable here silently ships nothing.
  const worker = new Worker(new URL("./05_primes.worker.ts", import.meta.url), {
    type: "module",
  });
  const client = createWorkerClient(worker);

  const LIMIT = 300_000;

  function onBlock(): void {
    out.textContent = "Counting on the main thread. The spinner is frozen.";
    const started = performance.now();
    const primes = blockingRun(LIMIT);
    const elapsed = Math.round(performance.now() - started);
    out.textContent = `${primes} primes in ${elapsed}ms, and ${elapsed}ms of no painting, no scrolling, no clicking.`;
  }

  async function onWorker(): Promise<void> {
    out.textContent = "Counting in a worker. The spinner keeps turning.";
    const started = performance.now();
    const primes = await client.run(LIMIT);
    const elapsed = Math.round(performance.now() - started);
    out.textContent = `${primes} primes in ${elapsed}ms. The same work, and the page stayed responsive throughout.`;
  }

  async function onBoth(): Promise<void> {
    out.textContent = "Two jobs, one channel. Watch which answer goes where.";

    // The slow one is started first and finishes second, which is the whole
    // point: without the id, the fast job's reply would resolve the slow
    // job's promise.
    const slow = client.run(LIMIT);
    const fast = client.run(1_000);

    const [slowResult, fastResult] = await Promise.all([slow, fast]);

    out.textContent =
      `below ${LIMIT}: ${slowResult} primes\n` +
      `below 1,000: ${fastResult} primes\n\n` +
      (fastResult === 168
        ? "Correct. The small job got the small answer, even though it was asked second\nand answered first."
        : "Wrong, and this is the bug: the replies were matched by arrival order.");
  }

  blockButton.addEventListener("click", onBlock);
  workerButton.addEventListener("click", onWorker);
  bothButton.addEventListener("click", onBoth);

  return () => {
    cancelAnimationFrame(handle);
    blockButton.removeEventListener("click", onBlock);
    workerButton.removeEventListener("click", onWorker);
    bothButton.removeEventListener("click", onBoth);
    // Not optional. Without it the thread outlives the lesson.
    client.dispose();
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "workers",
  title: "Web Workers and the main thread",
  summary: "The only way to not block the page. And why a message is not a reply.",
  file: "src/lessons/05_workers.ts",
  mount: mountWorkers,
};
