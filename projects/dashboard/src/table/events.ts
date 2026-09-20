/**
 * The row data for the virtualised table, and the sorting and filtering that
 * go with it. Pure functions, so all of it is testable without a DOM, which
 * matters here because the rendering half needs a real browser.
 */
export type Outcome = "ok" | "slow" | "error";

export type EventRow = {
  id: number;
  at: string;
  path: string;
  channel: "direct" | "search" | "referral";
  durationMs: number;
  outcome: Outcome;
};

const PATHS = [
  "/",
  "/pricing",
  "/docs/getting-started",
  "/docs/api",
  "/blog/hydration",
  "/changelog",
  "/account/settings",
];

const CHANNELS = ["direct", "search", "referral"] as const;

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

export const ROW_COUNT = 10_000;

export function buildEvents(count = ROW_COUNT): EventRow[] {
  const random = mulberry32(991);
  const start = Date.UTC(2026, 8, 20, 9, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const duration = Math.round(40 + random() ** 3 * 4200);
    const roll = random();

    return {
      id: index + 1,
      at: new Date(start + index * 7_000).toISOString(),
      path: PATHS[Math.floor(random() * PATHS.length)] ?? "/",
      channel: CHANNELS[Math.floor(random() * CHANNELS.length)] ?? "direct",
      durationMs: duration,
      // Derived from the duration for the slow ones, so the table tells a
      // consistent story rather than showing "ok" next to 4 seconds.
      outcome: roll < 0.03 ? "error" : duration > 2000 ? "slow" : "ok",
    };
  });
}

export const EVENTS = buildEvents();

export type SortKey = "at" | "path" | "channel" | "durationMs" | "outcome";
export type SortDirection = "asc" | "desc";
export type Sort = { key: SortKey; direction: SortDirection };

export function nextSort(current: Sort, key: SortKey): Sort {
  // Clicking the sorted column flips it; clicking another starts ascending.
  // Anything else surprises people who have used a table before.
  if (current.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: "asc" };
}

const OUTCOME_ORDER: Record<Outcome, number> = { ok: 0, slow: 1, error: 2 };

export function sortRows(rows: EventRow[], sort: Sort): EventRow[] {
  const factor = sort.direction === "asc" ? 1 : -1;

  // A copy: sorting the array in place would mutate the source data, and a
  // second render would sort an already-sorted array.
  return [...rows].sort((left, right) => {
    if (sort.key === "durationMs") return (left.durationMs - right.durationMs) * factor;
    if (sort.key === "outcome") {
      return (OUTCOME_ORDER[left.outcome] - OUTCOME_ORDER[right.outcome]) * factor;
    }
    return left[sort.key].localeCompare(right[sort.key]) * factor;
  });
}

export function filterRows(rows: EventRow[], query: string, outcome: Outcome | "all"): EventRow[] {
  const needle = query.trim().toLowerCase();

  return rows.filter((row) => {
    if (outcome !== "all" && row.outcome !== outcome) return false;
    if (needle === "") return true;
    return row.path.toLowerCase().includes(needle) || row.channel.includes(needle);
  });
}

/** The window a virtualiser renders: the viewport, plus overscan either side. */
export function visibleWindow(options: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
  count: number;
}): { start: number; end: number } {
  const { scrollTop, viewportHeight, rowHeight, overscan, count } = options;
  if (count === 0) return { start: 0, end: -1 };

  const first = Math.floor(scrollTop / rowHeight);
  const last = Math.ceil((scrollTop + viewportHeight) / rowHeight) - 1;

  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count - 1, last + overscan),
  };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "UTC" });
}
