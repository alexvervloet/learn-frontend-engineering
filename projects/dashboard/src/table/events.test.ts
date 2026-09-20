import { describe, expect, it } from "vitest";

import {
  EVENTS,
  buildEvents,
  filterRows,
  formatDuration,
  nextSort,
  sortRows,
  visibleWindow,
  type EventRow,
  type Sort,
} from "./events";

const SAMPLE: EventRow[] = [
  { id: 1, at: "2026-09-20T09:00:00.000Z", path: "/docs/api", channel: "search", durationMs: 120, outcome: "ok" },
  { id: 2, at: "2026-09-20T09:00:07.000Z", path: "/pricing", channel: "direct", durationMs: 3100, outcome: "slow" },
  { id: 3, at: "2026-09-20T09:00:14.000Z", path: "/", channel: "referral", durationMs: 90, outcome: "error" },
];

describe("generating the rows", () => {
  it("is deterministic, so a test and a screenshot agree run to run", () => {
    expect(buildEvents(20)).toEqual(buildEvents(20));
  });

  it("never labels a four-second request ok", () => {
    // The outcome is derived from the duration rather than rolled
    // separately, which is the whole reason the generator is worth testing.
    for (const row of EVENTS) {
      if (row.durationMs > 2000) expect(row.outcome).not.toBe("ok");
    }
  });

  it("makes enough rows that rendering all of them would be a mistake", () => {
    expect(EVENTS).toHaveLength(10_000);
  });
});

describe("sorting", () => {
  it("flips the column you are already sorted by and starts the rest ascending", () => {
    const start: Sort = { key: "at", direction: "desc" };

    expect(nextSort(start, "at")).toEqual({ key: "at", direction: "asc" });
    expect(nextSort(start, "path")).toEqual({ key: "path", direction: "asc" });
  });

  it("sorts duration as a number, not as a string", () => {
    const rows = sortRows(
      [
        { ...SAMPLE[0]!, durationMs: 9 },
        { ...SAMPLE[1]!, durationMs: 100 },
      ],
      { key: "durationMs", direction: "asc" },
    );

    // "100" < "9" alphabetically, which is the bug this catches.
    expect(rows.map((row) => row.durationMs)).toEqual([9, 100]);
  });

  it("orders outcomes by severity rather than alphabetically", () => {
    const rows = sortRows(SAMPLE, { key: "outcome", direction: "asc" });

    // Alphabetically it would be error, ok, slow.
    expect(rows.map((row) => row.outcome)).toEqual(["ok", "slow", "error"]);
  });

  it("does not mutate the source array", () => {
    const before = [...SAMPLE];
    sortRows(SAMPLE, { key: "path", direction: "desc" });

    expect(SAMPLE).toEqual(before);
  });
});

describe("filtering", () => {
  it("matches a path or a channel, ignoring case and surrounding space", () => {
    expect(filterRows(SAMPLE, "  DOCS ", "all").map((row) => row.id)).toEqual([1]);
    expect(filterRows(SAMPLE, "referral", "all").map((row) => row.id)).toEqual([3]);
  });

  it("combines the query with the outcome rather than replacing it", () => {
    expect(filterRows(SAMPLE, "/", "error").map((row) => row.id)).toEqual([3]);
    expect(filterRows(SAMPLE, "/pricing", "error")).toEqual([]);
  });

  it("returns everything for an empty query", () => {
    expect(filterRows(SAMPLE, "   ", "all")).toHaveLength(3);
  });
});

describe("the window a virtualiser renders", () => {
  const base = { rowHeight: 36, viewportHeight: 420, overscan: 8, count: 10_000 };

  it("is a small slice of a large list", () => {
    const { start, end } = visibleWindow({ ...base, scrollTop: 0 });

    // 12 rows fit, plus overscan below. Nowhere near 10,000, which is the point.
    expect(start).toBe(0);
    expect(end - start + 1).toBeLessThan(30);
  });

  it("moves with the scroll position", () => {
    const { start, end } = visibleWindow({ ...base, scrollTop: 3600 });

    expect(start).toBe(92);
    expect(end).toBeGreaterThan(100);
  });

  it("clamps at both ends instead of asking for row -1 or row 10,000", () => {
    expect(visibleWindow({ ...base, scrollTop: 0 }).start).toBe(0);
    expect(visibleWindow({ ...base, scrollTop: 36 * 10_000 }).end).toBe(9999);
    expect(visibleWindow({ ...base, scrollTop: 0, count: 0 })).toEqual({ start: 0, end: -1 });
  });
});

describe("formatting a duration", () => {
  it("switches unit rather than printing 3100 ms", () => {
    expect(formatDuration(940)).toBe("940 ms");
    expect(formatDuration(3100)).toBe("3.10 s");
  });
});
