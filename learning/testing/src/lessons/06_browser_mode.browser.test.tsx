import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeasuredColumns, columnsFor } from "./06_browser_mode";

/**
 * The same component, in Chromium, via `npm run test:browser -w learning/testing`.
 *
 * Every assertion here is one the jsdom file next door cannot make, which is
 * the rule for putting a test in this file. If jsdom could answer it, it
 * belongs in the fast suite.
 *
 * Note what has *not* changed: `render`, `screen`, the same queries and the
 * same `expect`. The environment moved and the test did not, which is the
 * whole argument for browser mode over rewriting these as Playwright specs.
 *
 * Vitest's own locator API (`page.getByTestId`, `expect.element`) is available
 * here and is a good API. This file stays on Testing Library on purpose, to
 * make the point that an existing suite moves environments without being
 * rewritten.
 */

/** Renders into a host of a known width, the way a container query would see it. */
function renderAtWidth(width: number) {
  const host = document.createElement("div");
  host.style.width = `${String(width)}px`;
  document.body.append(host);

  const result = render(<MeasuredColumns />, { container: host });
  return { ...result, host };
}

describe("a real engine measures the box", () => {
  it("reports a width that is not zero", async () => {
    renderAtWidth(900);

    // Read the number rather than asserting `not.toHaveTextContent("0")`.
    // That matcher does substring matching, so "900" contains "0" and the
    // negation fails against a perfectly correct measurement.
    await waitFor(() => {
      const measured = Number(screen.getByTestId("measured-width").textContent);
      // The assertion jsdom cannot make. There, this element is 0x0 forever.
      expect(measured).toBeGreaterThan(0);
    });
  });

  it("picks the column count its own width earns", async () => {
    renderAtWidth(900);

    // 900 is between the 800 and 1200 stops, so three columns.
    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent("3");
    });
  });

  it("agrees with the pure function it is built on", async () => {
    renderAtWidth(500);

    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent(String(columnsFor(500)));
    });
  });

  it("lays the cells out in that many columns, which is the part that matters", async () => {
    // The column count on screen is a number in a paragraph. This is the grid
    // actually being a grid, computed by the engine, which is a different
    // claim and the one a user experiences.
    renderAtWidth(900);

    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent("3");
    });

    const grid = screen.getByTestId("grid");
    const columns = getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean);

    expect(columns).toHaveLength(3);
    // And they are equal widths, which `minmax(0, 1fr)` exists to guarantee
    // and which no amount of reading the style string would prove.
    const widths = columns.map((value) => Math.round(parseFloat(value)));
    expect(new Set(widths).size).toBe(1);
  });

  it("re-measures when the host resizes, because ResizeObserver is real here", async () => {
    const { host } = renderAtWidth(300);

    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent("1");
    });

    // The repo-wide jsdom stub is a no-op, so this callback has never been
    // executed by the fast suite at all.
    host.style.width = "1300px";

    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent("4");
    });
  });

  it("puts every cell inside the grid's box", async () => {
    // Geometry, which is the category of claim this file exists for.
    renderAtWidth(900);

    await waitFor(() => {
      expect(screen.getByTestId("column-count")).toHaveTextContent("3");
    });

    const grid = screen.getByTestId("grid").getBoundingClientRect();
    const cells = screen.getAllByTestId("cell");

    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      const box = cell.getBoundingClientRect();
      expect(box.width).toBeGreaterThan(0);
      // A pixel of slack: subpixel layout means these rarely land on integers.
      expect(Math.round(box.left)).toBeGreaterThanOrEqual(Math.round(grid.left) - 1);
      expect(Math.round(box.right)).toBeLessThanOrEqual(Math.round(grid.right) + 1);
    }
  });
});
