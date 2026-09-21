import { describe, expect, it } from "vitest";

import { recordOrder, recordWithFrame } from "./02_event_loop";

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

/**
 * Where requestAnimationFrame falls is the part of the diagram that is
 * usually taught as a rule and is not one.
 *
 * rAF callbacks run in the "update the rendering" step, which the browser
 * performs when it decides to paint. A timer is an ordinary task. Nothing
 * in the spec orders the two against each other, so this suite asserts the
 * partial order that does hold and deliberately stops there.
 *
 * The full ordering is worth seeing, which is why the lesson prints it in a
 * browser instead. In Chromium the timer wins essentially every time; the
 * reason is scheduling, not a rule, and a test that pinned it down would be
 * asserting one browser's timing on one machine.
 */
describe("where a frame lands", () => {
  it("runs after the synchronous code and after the microtasks", async () => {
    const ticks = await recordWithFrame();

    expect(ticks[0]).toBe("sync: end of the function body");
    expect(ticks.indexOf("microtask: queueMicrotask")).toBeLessThan(
      ticks.indexOf("frame: requestAnimationFrame"),
    );
  });

  it("fires the frame and the timer exactly once each", async () => {
    // The claim this test really defends is that neither is dropped. A rAF
    // that never fires is how the previous version of this lesson could
    // describe an ordering its test never observed.
    const ticks = await recordWithFrame();

    expect(ticks).toContain("frame: requestAnimationFrame");
    expect(ticks).toContain("macrotask: setTimeout 0");
    expect(ticks).toHaveLength(4);
  });

  it("produces one of the two legal orderings and nothing else", async () => {
    // The point of the loop is that both answers are allowed, so the
    // assertion cannot name one. It can still be a real assertion: sync
    // first and the microtask second are guaranteed, and only the last two
    // may swap. An implementation that ran the frame before the microtasks
    // would fail here, which is the mistake this lesson used to teach.
    const SYNC = "sync: end of the function body";
    const MICRO = "microtask: queueMicrotask";
    const TIMER = "macrotask: setTimeout 0";
    const FRAME = "frame: requestAnimationFrame";

    for (let run = 0; run < 10; run += 1) {
      const ticks = await recordWithFrame();

      expect([
        [SYNC, MICRO, TIMER, FRAME],
        [SYNC, MICRO, FRAME, TIMER],
      ]).toContainEqual(ticks);
    }
  });
});
