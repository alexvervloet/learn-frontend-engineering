import { describe, expect, it } from "vitest";

import { recordOrder } from "./02_event_loop";

describe("event loop ordering", () => {
  it("drains sync, then every microtask, then the timer", async () => {
    // This order is guaranteed by the spec. If it ever changes, something much
    // more interesting than this test has broken.
    await expect(recordOrder()).resolves.toEqual([
      "sync: end of the function body",
      "microtask: queueMicrotask",
      "microtask: promise.then",
      "microtask: queued from a microtask",
      "macrotask: setTimeout 0",
    ]);
  });
});
