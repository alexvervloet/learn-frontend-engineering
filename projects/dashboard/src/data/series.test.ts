import { describe, expect, it } from "vitest";

import {
  CHANNELS,
  DAYS,
  SERIES,
  bestDay,
  buildSeries,
  changeVsPreviousPeriod,
  grandTotal,
  total,
  withinRange,
} from "./series";

describe("the data", () => {
  it("is deterministic, so a test and a screenshot agree", () => {
    // A seeded generator rather than Math.random, for exactly this.
    expect(buildSeries(5)).toEqual(buildSeries(5));
  });

  it("has a point per day", () => {
    expect(SERIES).toHaveLength(DAYS);
    expect(new Set(SERIES.map((point) => point.date)).size).toBe(DAYS);
  });

  it("keeps every series on one scale, so one chart is honest", () => {
    // Two measures of different magnitude belong in two charts. If these
    // ever diverge by an order of magnitude, the single y-axis is a lie.
    const totals = CHANNELS.map((channel) => total(SERIES, channel));
    const ratio = Math.max(...totals) / Math.min(...totals);

    expect(ratio).toBeLessThan(10);
  });
});

describe("the range filter", () => {
  it("takes the most recent days, not the first", () => {
    const week = withinRange(SERIES, "7");

    expect(week).toHaveLength(7);
    expect(week.at(-1)).toEqual(SERIES.at(-1));
  });
});

describe("the headline numbers", () => {
  it("compares against the period immediately before, not all of history", () => {
    // "+12%" with no baseline named is not information, and comparing
    // against everything is the classic way to make a number look good.
    const size = 30;
    const current = grandTotal(SERIES.slice(-size));
    const previous = grandTotal(SERIES.slice(-size * 2, -size));

    expect(changeVsPreviousPeriod(SERIES, "30")).toBeCloseTo((current - previous) / previous, 10);
  });

  it("returns null rather than a wrong number when there is not enough history", () => {
    expect(changeVsPreviousPeriod(buildSeries(30), "30")).toBeNull();
  });

  it("finds the best day by the total across channels", () => {
    const best = bestDay(SERIES);
    const totals = SERIES.map((point) => point.direct + point.search + point.referral);

    expect(best?.value).toBe(Math.max(...totals));
  });

  it("has nothing to say about an empty range", () => {
    expect(bestDay([])).toBeNull();
  });
});
