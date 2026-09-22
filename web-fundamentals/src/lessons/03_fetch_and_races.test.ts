import { describe, expect, it } from "vitest";

import {
  raceUnguarded,
  raceWithAbort,
  raceWithSequence,
  search,
  AbortError,
} from "./03_fetch_and_races";

// "re" is the slow one (900ms), "react" is fast (120ms). Fired together, "re"
// lands last.
const KEYSTROKES = ["re", "rea", "reac", "react"];

describe("stale responses", () => {
  it("shows the wrong results when nothing is cancelled", async () => {
    const shown = await raceUnguarded(KEYSTROKES);

    // The user typed "react" and is looking at the results for "re".
    expect(shown).toContain("reducer");
    expect(shown).not.toEqual(["react", "reactive"]);
  }, 10_000);

  it("shows the newest results when the old requests are aborted", async () => {
    await expect(raceWithAbort(KEYSTROKES)).resolves.toEqual(["react", "reactive"]);
  }, 10_000);

  it("shows the newest results when the old responses are ignored instead", async () => {
    await expect(raceWithSequence(KEYSTROKES)).resolves.toEqual(["react", "reactive"]);
  }, 10_000);

  /**
   * The difference between the two fixes, on the one request that shows it.
   *
   * Both put the right words on screen. What separates them is what happens to
   * the request they overtook: abort rejects it and clears the server's timer,
   * a sequence number lets it run to completion and then declines to use the
   * answer. Same UI, different amount of work, which is why abort wins when
   * you can have it.
   *
   * No wall-clock assertion here on purpose. The claim is about which promise
   * settles and how, and that is decidable; "the fast one finished sooner" is
   * a stopwatch reading that fails on a loaded CI box.
   */
  it("lets the superseded request finish, where abort rejects it", async () => {
    // What raceWithAbort does to a request that has been overtaken.
    const controller = new AbortController();
    const cancelled = search("re", controller.signal);
    controller.abort();
    await expect(cancelled).rejects.toBeInstanceOf(AbortError);

    // What raceWithSequence does to the same one: nothing at all. It runs, it
    // resolves, and only the guard downstream keeps it off the screen.
    await expect(search("re")).resolves.toContain("reducer");
  }, 10_000);

  it("rejects with an AbortError rather than resolving empty", async () => {
    const controller = new AbortController();
    const pending = search("re", controller.signal);
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(AbortError);
  });

  it("rejects immediately if the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(search("react", controller.signal)).rejects.toThrow("aborted before it started");
  });
});
