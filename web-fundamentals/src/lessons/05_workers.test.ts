import { describe, expect, it, vi } from "vitest";

import {
  countPrimesBelow,
  createWorkerClient,
  type WorkRequest,
  type WorkResponse,
  type WorkerLike,
} from "./05_workers";

/**
 * A stand-in for a real worker.
 *
 * jsdom implements no `Worker` at all, so there is no thread to talk to here.
 * That is fine, because the thread is not what these tests are about: the
 * protocol is. This double speaks the same two message types, replies after a
 * delay the test chooses, and lets a test make the second job answer first,
 * which is the case the id exists for and the case a real worker will not
 * reproduce on demand.
 *
 * Deliberately *not* a mock of `createWorkerClient`'s internals. It stands in
 * for the thing on the other side of `postMessage`, so everything the client
 * actually does still runs.
 */
function fakeWorker(options: { delayFor?: (request: WorkRequest) => number } = {}) {
  const listeners = new Set<(event: MessageEvent<WorkResponse>) => void>();
  const timers: ReturnType<typeof setTimeout>[] = [];
  let terminated = false;

  const emit = (data: WorkResponse): void => {
    for (const listener of listeners) listener({ data } as MessageEvent<WorkResponse>);
  };

  const worker: WorkerLike & { seen: WorkRequest[]; isTerminated: () => boolean } = {
    seen: [],
    isTerminated: () => terminated,

    postMessage(request: WorkRequest) {
      worker.seen.push(request);
      const delay = options.delayFor?.(request) ?? 0;

      timers.push(
        setTimeout(() => {
          if (terminated) return;
          try {
            emit({ id: request.id, ok: true, primes: countPrimesBelow(request.limit) });
          } catch (error) {
            emit({ id: request.id, ok: false, message: (error as Error).message });
          }
        }, delay),
      );
    },

    addEventListener(_type, listener) {
      listeners.add(listener);
    },

    removeEventListener(_type, listener) {
      listeners.delete(listener);
    },

    terminate() {
      terminated = true;
      for (const timer of timers) clearTimeout(timer);
    },
  };

  return worker;
}

describe("the work itself", () => {
  it("counts primes", () => {
    expect(countPrimesBelow(10)).toBe(4); // 2, 3, 5, 7
    expect(countPrimesBelow(1_000)).toBe(168);
    expect(countPrimesBelow(2)).toBe(0);
  });

  it("rejects a limit that is not a non-negative integer", () => {
    expect(() => countPrimesBelow(-1)).toThrow(RangeError);
    expect(() => countPrimesBelow(1.5)).toThrow(RangeError);
  });
});

describe("a message is not a reply", () => {
  it("resolves each caller with its own answer", async () => {
    const client = createWorkerClient(fakeWorker());

    await expect(client.run(10)).resolves.toBe(4);
    await expect(client.run(1_000)).resolves.toBe(168);

    client.dispose();
  });

  /**
   * The test this whole lesson is built around.
   *
   * Two jobs overlap and the second one answers first. A client that resolves
   * whatever promise is outstanding when a message arrives hands the small
   * job's answer to the big job, exactly the way lesson 03's search box shows
   * the results for a query the user has moved on from.
   *
   * Without the id in the protocol this test is not fixable, only reorderable,
   * which is why the id is in the protocol rather than bolted on in the
   * client.
   */
  it("does not hand the fast job's answer to the slow one", async () => {
    // The big job takes 30ms to come back, the small one 1ms.
    const worker = fakeWorker({ delayFor: (request) => (request.limit > 100 ? 30 : 1) });
    const client = createWorkerClient(worker);

    const slow = client.run(1_000);
    const fast = client.run(10);

    // Asked second, answers first.
    await expect(fast).resolves.toBe(4);
    await expect(slow).resolves.toBe(168);

    expect(worker.seen.map((request) => request.id)).toEqual([1, 2]);

    client.dispose();
  });

  it("turns a failure in the worker into a rejected promise", async () => {
    const client = createWorkerClient(fakeWorker());

    // Unhandled, an exception in a worker fires an `error` event on the worker
    // object and the caller's promise never settles at all.
    await expect(client.run(-5)).rejects.toThrow("non-negative integer");

    client.dispose();
  });
});

describe("cleaning up", () => {
  it("leaves nothing waiting once every job has settled", async () => {
    const client = createWorkerClient(fakeWorker());

    await Promise.all([client.run(10), client.run(100), client.run(1_000)]);

    expect(client.pending()).toBe(0);

    client.dispose();
  });

  it("terminates the thread and stops listening", () => {
    const worker = fakeWorker();
    const client = createWorkerClient(worker);

    client.dispose();

    expect(worker.isTerminated()).toBe(true);
  });

  /**
   * `terminate()` stops the thread mid-job, so a reply that had not arrived is
   * never arriving. A promise waiting on one would hang forever, and an
   * `await` that never returns is a component that never finishes unmounting
   * and a test that times out with no useful message.
   */
  it("rejects the jobs that will never come back", async () => {
    const worker = fakeWorker({ delayFor: () => 50 });
    const client = createWorkerClient(worker);

    const abandoned = client.run(1_000);
    expect(client.pending()).toBe(1);

    client.dispose();

    await expect(abandoned).rejects.toThrow("disposed");
    expect(client.pending()).toBe(0);
  });

  it("ignores a reply that arrives after dispose rather than misrouting it", async () => {
    const worker = fakeWorker();
    const client = createWorkerClient(worker);
    const onUnexpected = vi.fn();

    const abandoned = client.run(10).catch(onUnexpected);
    client.dispose();
    await abandoned;

    // It rejected once, from dispose, and nothing resolved it a second time.
    expect(onUnexpected).toHaveBeenCalledTimes(1);
  });
});
