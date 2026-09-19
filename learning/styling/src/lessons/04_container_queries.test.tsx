import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContainerQueries, layoutFor } from "./04_container_queries";

/**
 * jsdom does no layout and implements neither `@container` nor
 * `ResizeObserver`, so nothing here can assert what the cards *look* like. Two
 * things are still worth testing, and they are the two that break in practice:
 * the branch the JavaScript version has to make, and whether the CSS version
 * carries the classes that make the query work at all.
 *
 * Seeing the layouts actually flip is a Playwright job, and the testing module
 * does it there.
 */
describe("the branch the JS version makes by hand", () => {
  it("flips at the same width the @md container variant does", () => {
    expect(layoutFor(351)).toBe("stacked");
    expect(layoutFor(352)).toBe("side-by-side");
  });

  it("treats a zero width as stacked rather than throwing", () => {
    // The first ResizeObserver callback for a hidden element reports 0.
    expect(layoutFor(0)).toBe("stacked");
  });
});

describe("the CSS version", () => {
  it("puts the container context on a different element from the query", () => {
    render(<ContainerQueries />);

    const host = screen.getByTestId("css-host");
    const card = screen.getByTestId("css-card");

    // An element cannot query itself. If these were the same node the variant
    // would never match, silently.
    expect(host).toHaveClass("@container");
    expect(card).not.toHaveClass("@container");
    expect(host).toContainElement(card);
  });

  it("carries the container variant, not a viewport breakpoint", () => {
    render(<ContainerQueries />);

    const classes = [...screen.getByTestId("css-card").classList];

    expect(classes).toContain("@md:flex-row");
    // `md:flex-row` would be a viewport query, which is the bug this lesson is
    // about. The @ prefix is the entire difference.
    expect(classes).not.toContain("md:flex-row");
  });
});

describe("the JS version", () => {
  it("starts stacked, because the element has not been measured yet", () => {
    render(<ContainerQueries />);

    // The wrong-for-one-frame layout. The CSS card never has this problem.
    expect(screen.getByTestId("observed-card")).toHaveAttribute("data-layout", "stacked");
  });
});
