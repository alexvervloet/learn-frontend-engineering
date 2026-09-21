/**
 * The arithmetic behind the chart, extracted so it can be tested without
 * rendering anything.
 *
 * Everything a chart gets wrong visually starts here: an axis that does not
 * include zero, ticks at 3,333, a path that runs outside the plot area. Those
 * are assertions, not judgement calls.
 */
/**
 * `step` is part of the extent, not something `ticks` recomputes.
 *
 * Deriving the ticks by dividing the range into a fixed count gives round
 * ticks only when the range happens to divide evenly. Choosing a round step
 * first and letting the count fall out of it gives round ticks always,
 * which is the point of a "nice" scale.
 */
export type Extent = { min: number; max: number; step: number };

export type Plot = {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
};

export function innerWidth(plot: Plot): number {
  return plot.width - plot.padding.left - plot.padding.right;
}

export function innerHeight(plot: Plot): number {
  return plot.height - plot.padding.top - plot.padding.bottom;
}

/**
 * Rounds the top of the scale up to a clean number, so the ticks read as
 * 0 / 1,000 / 2,000 rather than 0 / 1,143 / 2,286.
 *
 * The bottom is pinned to zero for a magnitude chart. Truncating the axis
 * exaggerates every difference on it, which is the most effective way to
 * mislead with a chart that is technically accurate.
 */
export function niceExtent(values: number[], tickCount = 4): Extent {
  if (values.length === 0) return { min: 0, max: 1, step: 1 };

  const rawMax = Math.max(...values);
  if (rawMax <= 0) return { min: 0, max: 1, step: 1 };

  const rough = rawMax / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((factor) => factor * magnitude)
      .find((candidate) => candidate >= rough) ?? magnitude * 10;

  return { min: 0, max: Math.ceil(rawMax / step) * step, step };
}

export function ticks(extent: Extent): number[] {
  const count = Math.round((extent.max - extent.min) / extent.step);

  return Array.from({ length: count + 1 }, (_, index) => extent.min + index * extent.step);
}

export function xAt(index: number, length: number, plot: Plot): number {
  if (length <= 1) return plot.padding.left;
  return plot.padding.left + (index / (length - 1)) * innerWidth(plot);
}

export function yAt(value: number, extent: Extent, plot: Plot): number {
  const span = extent.max - extent.min || 1;
  const ratio = (value - extent.min) / span;
  return plot.padding.top + (1 - ratio) * innerHeight(plot);
}

/** An SVG path for one series. Straight segments: a smoothed line invents data. */
export function linePath(values: number[], extent: Extent, plot: Plot): string {
  return values
    .map((value, index) => {
      const x = xAt(index, values.length, plot).toFixed(2);
      const y = yAt(value, extent, plot).toFixed(2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

/** Which data index a pointer at `x` is nearest, for the crosshair. */
export function indexAtX(x: number, length: number, plot: Plot): number {
  if (length <= 1) return 0;

  const ratio = (x - plot.padding.left) / innerWidth(plot);
  const index = Math.round(ratio * (length - 1));

  return Math.min(length - 1, Math.max(0, index));
}

/**
 * Compact for an axis, where space is the constraint.
 *
 * The uppercase pass is deliberate: `Intl` returns "1.5k" in this locale and
 * "1.5K" reads better on a chart.
 *
 * It is also where this function was wrong for a while. The first version
 * matched `/([a-z])$/`, one letter at the end, which is right up to a
 * million and wrong after it, because en-GB compact notation is "bn" and
 * "tn" rather than "b" and "t". That produced "1.5bN". The chart's own data
 * is in the thousands so nothing ever rendered it, which is exactly the kind
 * of bug a unit test is for and exactly the kind a unit test misses when it
 * only checks the values the caller happens to pass today.
 *
 * Match the whole trailing run of letters instead. That also survives a
 * locale whose suffix is longer still, which matters more than it looks:
 * Intl output depends on the runtime's ICU data, so asserting an exact
 * formatted string without normalising it is a test that passes locally and
 * fails on CI.
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 })
    .format(value)
    .replace(/\p{Ll}+$/u, (suffix) => suffix.toUpperCase());
}

export function formatFull(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}
