import type { Channel } from "../data/series";

/**
 * Series colour is looked up by the *entity*, never by its position in a
 * filtered list. Hiding one series must not repaint the survivors: a reader
 * who has learnt that orange is search should not find orange meaning
 * referral one click later.
 */
export const SERIES_VAR: Record<Channel, string> = {
  direct: "var(--series-direct)",
  search: "var(--series-search)",
  referral: "var(--series-referral)",
};

export const SERIES_LABEL: Record<Channel, string> = {
  direct: "Direct",
  search: "Search",
  referral: "Referral",
};

/** Mark specs from the data-viz method, in one place so nothing drifts. */
export const MARKS = {
  lineWidth: 2,
  /** >= 8px diameter, so r >= 4. */
  markerRadius: 4,
  /** A ring in the surface colour, so overlapping dots stay countable. */
  markerRing: 2,
  gridWidth: 1,
} as const;
