import { describe, expect, it } from "vitest";

import {
  formatCompact,
  indexAtX,
  innerHeight,
  innerWidth,
  linePath,
  niceExtent,
  ticks,
  xAt,
  yAt,
  type Plot,
} from "./scale";

const PLOT: Plot = {
  width: 720,
  height: 280,
  padding: { top: 16, right: 88, bottom: 28, left: 48 },
};

describe("the y scale", () => {
  it("always includes zero", () => {
    // Truncating the axis exaggerates every difference on it, which is the
    // most effective way to mislead with a chart that is technically
    // accurate.
    expect(niceExtent([980, 1010, 1005]).min).toBe(0);
  });

  it("rounds the top to a clean number", () => {
    // 0 / 500 / 1,000 / 1,500 / 2,000, not 0 / 393 / 786 / 1,179 / 1,572.
    expect(niceExtent([1572]).max).toBe(2000);
    expect(niceExtent([4100]).max).toBe(6000);
    expect(niceExtent([88]).max).toBe(100);
  });

  it("gives round ticks whatever the data, which a fixed count does not", () => {
    // The first version divided the range into four and produced ticks at
    // 1,025. The step is chosen round first and the count falls out of it.
    for (const values of [[1572], [4100], [88], [37], [999_999]]) {
      for (const tick of ticks(niceExtent(values))) {
        const digits = String(Math.round(tick)).replace(/0+$/, "");
        expect(digits.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("never clips the data", () => {
    for (const values of [[1], [999], [1001], [12345], [7, 7, 7]]) {
      expect(niceExtent(values).max).toBeGreaterThanOrEqual(Math.max(...values));
    }
  });

  it("survives an empty or all-zero series", () => {
    expect(niceExtent([])).toEqual({ min: 0, max: 1, step: 1 });
    expect(niceExtent([0, 0])).toEqual({ min: 0, max: 1, step: 1 });
  });

  it("produces ticks that are round numbers", () => {
    const extent = niceExtent([1572]);

    expect(ticks(extent)).toEqual([0, 500, 1000, 1500, 2000]);
  });
});

describe("placing a point", () => {
  const extent = { min: 0, max: 2000, step: 500 };

  it("puts the first and last points on the plot edges", () => {
    expect(xAt(0, 10, PLOT)).toBe(PLOT.padding.left);
    expect(xAt(9, 10, PLOT)).toBeCloseTo(PLOT.width - PLOT.padding.right);
  });

  it("puts zero on the baseline and the maximum at the top", () => {
    expect(yAt(0, extent, PLOT)).toBeCloseTo(PLOT.height - PLOT.padding.bottom);
    expect(yAt(2000, extent, PLOT)).toBeCloseTo(PLOT.padding.top);
  });

  it("never draws outside the plot area", () => {
    const values = [0, 500, 1000, 1500, 2000];

    for (const [index, value] of values.entries()) {
      const x = xAt(index, values.length, PLOT);
      const y = yAt(value, extent, PLOT);

      expect(x).toBeGreaterThanOrEqual(PLOT.padding.left);
      expect(x).toBeLessThanOrEqual(PLOT.width - PLOT.padding.right);
      expect(y).toBeGreaterThanOrEqual(PLOT.padding.top);
      expect(y).toBeLessThanOrEqual(PLOT.height - PLOT.padding.bottom);
    }
  });

  it("handles a single point without dividing by zero", () => {
    expect(xAt(0, 1, PLOT)).toBe(PLOT.padding.left);
    expect(Number.isNaN(xAt(0, 1, PLOT))).toBe(false);
  });

  it("leaves room on the right for the end labels", () => {
    // The direct labels live in that padding. Without it they are clipped,
    // and a clipped label is worse than no label.
    expect(PLOT.padding.right).toBeGreaterThan(60);
    expect(innerWidth(PLOT)).toBeGreaterThan(0);
    expect(innerHeight(PLOT)).toBeGreaterThan(0);
  });
});

describe("the path", () => {
  it("starts with a move and continues with lines", () => {
    const path = linePath([0, 1000, 2000], { min: 0, max: 2000, step: 500 }, PLOT);

    expect(path.startsWith("M ")).toBe(true);
    expect(path.match(/L /g)).toHaveLength(2);
  });

  it("uses straight segments, because a smoothed line invents data", () => {
    // No C or Q commands: a bezier through three points draws values
    // between them that were never measured.
    expect(linePath([0, 1000, 2000], { min: 0, max: 2000, step: 500 }, PLOT)).not.toMatch(/[CQS]/);
  });
});

describe("the crosshair", () => {
  it("snaps to the nearest point", () => {
    expect(indexAtX(PLOT.padding.left, 10, PLOT)).toBe(0);
    expect(indexAtX(PLOT.width - PLOT.padding.right, 10, PLOT)).toBe(9);
  });

  it("clamps rather than returning an index off the end", () => {
    expect(indexAtX(-500, 10, PLOT)).toBe(0);
    expect(indexAtX(99_999, 10, PLOT)).toBe(9);
  });
});

describe("number formatting", () => {
  it("is compact on an axis and exact in a tooltip", () => {
    // Uppercased by hand: this runtime's ICU returns "1.5k".
    expect(formatCompact(1500)).toBe("1.5K");
    expect(formatCompact(0)).toBe("0");
  });
});
