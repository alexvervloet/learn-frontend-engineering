/**
 * The data the dashboard reads.
 *
 * Three series on one scale, on purpose. Two measures of different scale go in
 * two charts, never on two y-axes: a dual-axis chart lets whoever drew it
 * decide where the lines cross, which makes any "these correlate" reading an
 * artefact of the axis choice rather than of the data.
 */
export type Channel = "direct" | "search" | "referral";

export const CHANNELS: Channel[] = ["direct", "search", "referral"];

export type DayPoint = { date: string; direct: number; search: number; referral: number };

/**
 * Deterministic, so a chart snapshot and a test agree run to run. A seeded
 * generator rather than Math.random for exactly that reason.
 */
function mulberry32(seed: number): () => number {
  let state = seed;

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DAYS = 90;

export function buildSeries(days = DAYS): DayPoint[] {
  const random = mulberry32(20260920);
  const start = Date.UTC(2026, 5, 23);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    // A weekly rhythm plus a slow upward trend, so the chart has something to
    // read rather than noise.
    const trend = 1 + index / days / 2;
    const dip = weekend ? 0.62 : 1;

    return {
      date: date.toISOString().slice(0, 10),
      direct: Math.round((900 + random() * 260) * trend * dip),
      search: Math.round((1400 + random() * 420) * trend * dip),
      referral: Math.round((380 + random() * 200) * trend * dip),
    };
  });
}

export const SERIES = buildSeries();

export type RangeKey = "7" | "30" | "90";

export function withinRange(points: DayPoint[], range: RangeKey): DayPoint[] {
  return points.slice(-Number(range));
}

export function total(points: DayPoint[], channel: Channel): number {
  return points.reduce((sum, point) => sum + point[channel], 0);
}

export function grandTotal(points: DayPoint[]): number {
  return CHANNELS.reduce((sum, channel) => sum + total(points, channel), 0);
}

/**
 * The change against the period immediately before this one, which is the
 * comparison a "+12%" on a dashboard has to mean. Comparing against the whole
 * history instead is the classic way to make a number look good.
 */
export function changeVsPreviousPeriod(points: DayPoint[], range: RangeKey): number | null {
  const size = Number(range);
  if (points.length < size * 2) return null;

  const current = grandTotal(points.slice(-size));
  const previous = grandTotal(points.slice(-size * 2, -size));
  if (previous === 0) return null;

  return (current - previous) / previous;
}

export function bestDay(points: DayPoint[]): { date: string; value: number } | null {
  if (points.length === 0) return null;

  return points
    .map((point) => ({ date: point.date, value: point.direct + point.search + point.referral }))
    .reduce((best, candidate) => (candidate.value > best.value ? candidate : best));
}
