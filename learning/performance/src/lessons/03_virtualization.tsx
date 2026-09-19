/**
 * Virtualization
 * ==============
 * Ten thousand rows is ten thousand DOM nodes, and the browser pays for all of
 * them: layout, style recalculation, memory, and a scroll that gets worse as
 * the list grows. Virtualization renders only the rows in view, plus a few
 * either side, and fakes the rest with height.
 *
 *   const rowVirtualizer = useVirtualizer({
 *     count: rows.length,
 *     getScrollElement: () => parentRef.current,
 *     estimateSize: () => 32,
 *     overscan: 8,
 *   });
 *
 * The container gets `getTotalSize()` in pixels so the scrollbar is the right
 * length, and each visible row is absolutely positioned at its own offset.
 * Scrolling changes which rows exist, not where they are.
 *
 * **It is not the first thing to reach for.** A hundred rows do not need it,
 * and it costs real complexity: absolute positioning, a measured container,
 * rows that cannot size themselves from their content without
 * `measureElement`, and `Ctrl-F` no longer finding text that is not rendered.
 * Reach for it past a few hundred rows, or when the rows are expensive.
 *
 * **Variable heights need measurement.** `estimateSize` is a guess used before
 * a row has been seen; `measureElement` on the row's ref replaces the guess
 * with the real height and adjusts the total. Without it, a list of rows with
 * differing heights scrolls with a jumping scrollbar.
 *
 * **Accessibility does not come for free.** A virtualised list is not a `<ul>`
 * with all its items: screen readers cannot count what is not there. Say how
 * many there are with `aria-rowcount` and `aria-rowindex`, or announce the
 * count separately. Keyboard navigation has to scroll the target into view
 * itself, because Tab cannot reach a row that has not been rendered.
 *
 * **This lesson is where jsdom runs out.** A virtualizer measures a scroll
 * container and asks which rows overlap the viewport. jsdom does no layout, so
 * every element reports 0×0, the virtualizer concludes nothing is visible, and
 * it renders no rows at all. Mocking `getBoundingClientRect` and firing a fake
 * `ResizeObserver` does not rescue it either; at that point the test is
 * asserting against a pile of stubs rather than against a browser.
 *
 * So the tests beside this file check two things jsdom *can* answer: the total
 * scroll height, and the windowing arithmetic, extracted as `visibleWindow`
 * below. The claim that actually matters, that twenty rows reach the DOM
 * instead of ten thousand, is a Playwright spec in `learning/testing/e2e`.
 *
 * **The compiler declines to optimise this component**, and says so:
 * `react-hooks/incompatible-library`, "TanStack Virtual's `useVirtualizer()`
 * API returns functions that cannot be memoized safely". The virtualizer hands
 * back methods that read mutable internal state, so caching their results
 * would serve stale rows. This is worth seeing: the compiler is not silent
 * when it gives up, and the lint rule is how it tells you. The disable below
 * acknowledges it rather than hiding it.
 */
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";

const ROWS = Array.from({ length: 10_000 }, (_, index) => ({
  id: index,
  label: `Row ${index}`,
  value: Math.round(Math.sin(index) * 1000) / 10,
}));

export const ROW_HEIGHT = 32;
export const VIEWPORT_HEIGHT = 320;
export const OVERSCAN = 8;
export const ROW_COUNT = ROWS.length;

/**
 * The arithmetic a virtualizer does, written out. The component below does not
 * call this: TanStack Virtual has its own, and a reimplementation used in
 * anger would drift. It is here because it is the part worth understanding and
 * the part a test without layout can still check.
 */
export function visibleWindow(options: {
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
  count: number;
}): { start: number; end: number } {
  const { scrollTop, viewportHeight, rowHeight, overscan, count } = options;

  const first = Math.floor(scrollTop / rowHeight);
  const last = Math.ceil((scrollTop + viewportHeight) / rowHeight) - 1;

  return {
    start: Math.max(0, first - overscan),
    end: Math.min(count - 1, last + overscan),
  };
}

export function Virtualization() {
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: ROWS.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    // A few rows either side of the viewport, so a fast scroll does not show
    // blank space before the next render catches up.
    overscan: OVERSCAN,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="stack">
      <p>
        {ROWS.length.toLocaleString()} rows, <span data-testid="rendered">{items.length}</span> in
        the DOM
      </p>

      <div
        ref={parentRef}
        data-testid="scroller"
        style={{
          height: VIEWPORT_HEIGHT,
          overflow: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {/* The full height, so the scrollbar is honest about how much there is. */}
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {items.map((item) => (
            <div
              key={item.key}
              data-testid={`row-${item.index}`}
              // Told to assistive tech, because it cannot count rows that do
              // not exist in the DOM.
              aria-rowindex={item.index + 1}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: item.size,
                transform: `translateY(${item.start}px)`,
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0 0.75rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ width: "6rem" }}>{ROWS[item.index]?.label}</span>
              <span className="note">{ROWS[item.index]?.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="note">
        Scroll it and watch the count in the DOM stay roughly constant. Open the elements panel:
        there are about twenty divs in there, not ten thousand. Ctrl-F will not find row 9,000,
        which is the trade.
      </p>
    </div>
  );
}
