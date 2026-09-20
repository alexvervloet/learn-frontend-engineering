import { useVirtualizer } from "@tanstack/react-virtual";
import { useId, useRef, useState } from "react";

import {
  formatDuration,
  formatTime,
  nextSort,
  type EventRow,
  type Sort,
  type SortKey,
} from "./events";

export const ROW_HEIGHT = 36;
export const VIEWPORT_HEIGHT = 420;
export const OVERSCAN = 8;

/** Narrower than this and the five columns collide, so the grid scrolls. */
const MIN_WIDTH = "40rem";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "at", label: "Time", align: "left" },
  { key: "path", label: "Path", align: "left" },
  { key: "channel", label: "Channel", align: "left" },
  { key: "durationMs", label: "Duration", align: "right" },
  { key: "outcome", label: "Outcome", align: "left" },
];

const OUTCOME_STYLE = {
  ok: { background: "color-mix(in oklab, #0ca30c 14%, transparent)", color: "var(--text-primary)" },
  slow: {
    background: "color-mix(in oklab, #fab219 22%, transparent)",
    color: "var(--text-primary)",
  },
  error: {
    background: "color-mix(in oklab, #d03b3b 18%, transparent)",
    color: "var(--text-primary)",
  },
} as const;

/** An icon as well as the colour: a status must never be colour alone. */
const OUTCOME_ICON = { ok: "✓", slow: "◷", error: "✕" } as const;

export function EventTable({
  rows,
  sort,
  onSortChange,
}: {
  rows: EventRow[];
  sort: Sort;
  onSortChange: (sort: Sort) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeRow, setActiveRow] = useState(0);
  const rowId = useId();

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  /**
   * Arrow keys move a roving focus through the rows, and the grid is one tab
   * stop rather than ten thousand. Without this, Tab cannot get past the
   * table at all, which is the thing virtualisation quietly breaks: a row
   * that has not been rendered cannot be reached.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 10,
      PageUp: -10,
    };

    let next: number | null = null;
    if (event.key in moves) next = activeRow + (moves[event.key] ?? 0);
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = rows.length - 1;
    if (next === null) return;

    event.preventDefault();
    const clamped = Math.min(rows.length - 1, Math.max(0, next));
    setActiveRow(clamped);
    // The row may not be rendered yet, so scrolling it into view is the
    // virtualiser's job rather than the browser's.
    virtualizer.scrollToIndex(clamped, { align: "auto" });
  }

  return (
    <>
      <div
        role="grid"
        aria-label="Recent events"
        // Told explicitly, because a screen reader cannot count rows that are
        // not in the DOM.
        aria-rowcount={rows.length}
        aria-colcount={COLUMNS.length}
        tabIndex={0}
        // The grid keeps DOM focus and points at the active row. Moving real
        // focus to a row instead would fight the virtualiser, which unmounts
        // the focused element as soon as it scrolls out of the window.
        aria-activedescendant={rows.length === 0 ? undefined : `${rowId}-${activeRow}`}
        onKeyDown={onKeyDown}
        className="rounded-xl"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--grid)",
          // The grid is the scroll container, rather than wrapping a separate
          // scrolling div. A nested scroller would be a keyboard-inaccessible
          // scrollable region (axe's `scrollable-region-focusable`), and the
          // obvious remedy, giving it tabIndex, puts a second tab stop inside
          // a widget that is meant to be one. This element already has focus
          // and already handles the keys, so it scrolls.
          //
          // Five columns need about 40rem, so on a phone it scrolls sideways
          // here too, instead of widening the document and giving every other
          // section a horizontal scrollbar.
          overflow: "auto",
          maxHeight: VIEWPORT_HEIGHT,
        }}
        ref={scrollRef}
        data-testid="event-grid"
      >
        <div role="rowgroup" style={{ position: "sticky", top: 0, zIndex: 1 }}>
          <div
            role="row"
            aria-rowindex={1}
            className="grid text-sm font-medium"
            style={{
              gridTemplateColumns: "8rem 1fr 7rem 7rem 7rem",
              minWidth: MIN_WIDTH,
              borderBottom: "1px solid var(--grid)",
              background: "var(--surface-1)",
            }}
          >
            {COLUMNS.map((column, index) => {
              const isSorted = sort.key === column.key;

              return (
                <div
                  key={column.key}
                  role="columnheader"
                  aria-colindex={index + 1}
                  // The property a screen reader reads to announce the sort.
                  aria-sort={
                    isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                  }
                  className={column.align === "right" ? "text-right" : "text-left"}
                >
                  <button
                    type="button"
                    onClick={() => onSortChange(nextSort(sort, column.key))}
                    className="w-full px-3 py-2 text-inherit"
                    style={{ textAlign: column.align }}
                  >
                    {column.label}
                    {/* An arrow, not only the aria-sort: a sighted user needs
                      to see which column is sorted too. */}
                    <span aria-hidden="true">
                      {" "}
                      {isSorted ? (sort.direction === "asc" ? "↑" : "↓") : ""}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* The full height, so the scrollbar is honest about how much there
          is even though almost none of it exists. */}
        <div
          style={{ height: virtualizer.getTotalSize(), position: "relative", minWidth: MIN_WIDTH }}
          role="rowgroup"
        >
          {items.map((item) => {
            const row = rows[item.index];
            if (row === undefined) return null;
            const isActive = item.index === activeRow;

            return (
              <div
                key={item.key}
                id={`${rowId}-${item.index}`}
                role="row"
                // 1-based, and offset by the header row.
                aria-rowindex={item.index + 2}
                aria-selected={isActive}
                data-testid={`row-${item.index}`}
                className="grid items-center text-sm"
                style={{
                  gridTemplateColumns: "8rem 1fr 7rem 7rem 7rem",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: item.size,
                  transform: `translateY(${item.start}px)`,
                  background: isActive ? "var(--surface-2)" : undefined,
                  borderBottom: "1px solid var(--grid)",
                }}
              >
                <span role="gridcell" aria-colindex={1} className="tabular px-3">
                  {formatTime(row.at)}
                </span>
                <span role="gridcell" aria-colindex={2} className="truncate px-3">
                  {row.path}
                </span>
                <span role="gridcell" aria-colindex={3} className="px-3">
                  {row.channel}
                </span>
                <span role="gridcell" aria-colindex={4} className="tabular px-3 text-right">
                  {formatDuration(row.durationMs)}
                </span>
                <span role="gridcell" aria-colindex={5} className="px-3">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={OUTCOME_STYLE[row.outcome]}
                  >
                    <span aria-hidden="true">{OUTCOME_ICON[row.outcome]}</span>
                    {row.outcome}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outside the grid, not inside it: a role="grid" may only contain
          rows and rowgroups, and it is now the scroll container, so a
          paragraph in there would scroll away with the rows. */}
      <p className="px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span data-testid="rendered-count">{items.length}</span> of{" "}
        <span className="tabular">{rows.length.toLocaleString("en-GB")}</span> rows in the DOM ·
        arrow keys, Page Up/Down, Home and End move through them
      </p>
    </>
  );
}
