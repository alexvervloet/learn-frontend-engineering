import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeasuredColumns, columnsFor } from "./06_browser_mode";

/**
 * The jsdom half, and it is honest about being the smaller half.
 *
 * The arithmetic is pure, so it is checked here and there is no reason to
 * start a browser for a comparison operator. What cannot be checked here is
 * the measurement that feeds it, because jsdom does no layout and every
 * element is 0×0.
 *
 * `06_browser_mode.browser.test.tsx` is the same component under
 * `npm run test:browser -w learning/testing`, in a real Chromium.
 */
describe("the arithmetic, which needs no browser at all", () => {
  it("picks a column count per breakpoint", () => {
    expect(columnsFor(0)).toBe(1);
    expect(columnsFor(399)).toBe(1);
    expect(columnsFor(400)).toBe(2);
    expect(columnsFor(799)).toBe(2);
    expect(columnsFor(800)).toBe(3);
    expect(columnsFor(1200)).toBe(4);
  });

  it("is inclusive at the breakpoint, which is the off-by-one worth pinning", () => {
    expect(columnsFor(400)).toBe(2);
    expect(columnsFor(400 - 0.5)).toBe(1);
  });

  it("does not go below one column for a nonsense width", () => {
    // Width can be 0 during the first render and negative never, but a
    // display:none ancestor reports 0 and a grid with 0 columns is invalid
    // CSS that silently collapses the layout.
    expect(columnsFor(0)).toBe(1);
    expect(columnsFor(-100)).toBe(1);
  });
});

describe("what jsdom can say about the component", () => {
  it("renders every cell", () => {
    // Structure is fine. jsdom is a DOM, it is just not a renderer.
    render(<MeasuredColumns items={6} />);
    expect(screen.getAllByTestId("cell")).toHaveLength(6);
  });

  it("measures zero, and therefore falls back to one column", () => {
    // Not a bug being papered over. This asserts the fallback is sane, which
    // is a real requirement: a component that divides by its own width has to
    // survive being measured before layout, inside a display:none ancestor,
    // and during server rendering.
    render(<MeasuredColumns />);

    expect(screen.getByTestId("measured-width")).toHaveTextContent("0");
    expect(screen.getByTestId("column-count")).toHaveTextContent("1");
  });

  it("cannot tell you what a browser would do, and should not pretend to", () => {
    // The repo-wide setup stubs ResizeObserver with a no-op precisely so this
    // stays true. A fake reporting plausible sizes would let this file assert
    // a column count no browser had computed, which is worse than not
    // asserting it: the test would pass while the component was broken.
    render(<MeasuredColumns />);

    const grid = screen.getByTestId("grid");
    expect(grid.style.gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    // And the box really is zero-sized here, which is the whole problem.
    expect(grid.getBoundingClientRect().width).toBe(0);
  });
});
