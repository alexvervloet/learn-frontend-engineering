import { describe, expect, it } from "vitest";

import { raceUnguarded, raceWithAbort, search, AbortError } from "./03_fetch_and_races";

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
