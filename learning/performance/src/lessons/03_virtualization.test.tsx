import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  OVERSCAN,
  ROW_COUNT,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  Virtualization,
  visibleWindow,
} from "./03_virtualization";

/**
 * Nothing here asserts that only twenty rows reach the DOM, because in jsdom
 * none of them do. jsdom performs no layout, so the scroll container measures
 * 0×0 and the virtualizer correctly concludes that nothing is visible.
 *
 * Mocking `getBoundingClientRect` and firing a fake `ResizeObserver` gets it
 * part of the way and no further, and a test held together by four stubs is
 * asserting about the stubs. The real claim is checked in a browser:
 * `learning/testing/e2e/virtualization.spec.ts`.
 *
 * What is left is worth testing on its own: the arithmetic, and the scroll
 * height, which needs no layout because it is `count × estimateSize`.
 */
describe("the windowing arithmetic", () => {
  const base = {
    viewportHeight: VIEWPORT_HEIGHT,
    rowHeight: ROW_HEIGHT,
    overscan: OVERSCAN,
    count: ROW_COUNT,
  };

  it("covers the viewport plus the overscan", () => {
    const { start, end } = visibleWindow({ ...base, scrollTop: 3200 });

    // 3200 / 32 = row 100 at the top, 10 rows of viewport, 8 either side.
    expect(start).toBe(100 - OVERSCAN);
    expect(end).toBe(109 + OVERSCAN);
  });

  it("never asks for a row before the first", () => {
    const { start } = visibleWindow({ ...base, scrollTop: 0 });

    // 0 - 8 would be -8, which would index off the front of the array.
    expect(start).toBe(0);
  });

  it("never asks for a row past the last", () => {
    const { end } = visibleWindow({ ...base, scrollTop: ROW_COUNT * ROW_HEIGHT });

    expect(end).toBe(ROW_COUNT - 1);
  });

  it("renders a roughly constant number of rows however far you scroll", () => {
    const near = visibleWindow({ ...base, scrollTop: 3200 });
    const far = visibleWindow({ ...base, scrollTop: 300_000 });

    // The point of the whole technique: cost does not grow with the list.
    expect(far.end - far.start).toBe(near.end - near.start);
    expect(near.end - near.start).toBeLessThan(40);
  });
});

describe("what the component renders without layout", () => {
  it("mounts, and gives the scroller the full scroll height", () => {
    render(<Virtualization />);

    // count × estimateSize, which needs no measurement. This is what makes the
    // scrollbar the right length before anything has been measured.
    const inner = screen.getByTestId("scroller").firstElementChild as HTMLElement;
    expect(inner.style.height).toBe(`${ROW_COUNT * ROW_HEIGHT}px`);
  });

  it("reports how many rows are in the DOM", () => {
    render(<Virtualization />);

    // Zero here, and about twenty in a browser. The number being visible on
    // screen is the point of the demo.
    expect(screen.getByTestId("rendered")).toBeInTheDocument();
  });
});
