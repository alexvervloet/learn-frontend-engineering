import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { EventTable, VIEWPORT_HEIGHT } from "./EventTable";
import { buildEvents, type Sort } from "./events";

/**
 * jsdom does no layout, so every element measures 0x0, and a virtualiser
 * handed a 0px-tall viewport is right to render no rows at all. Without this
 * the whole file would pass green against an empty grid.
 *
 * The virtualiser's own `initialRect` option does not help: it measures the
 * element synchronously on mount and overwrites it. So the measurement is
 * what gets stubbed, for the scroller only. It reads `offsetHeight` rather
 * than `getBoundingClientRect`, which is worth knowing before you stub the
 * wrong one and conclude the component is broken.
 *
 * What this buys is the component's arithmetic, its ARIA, and its key
 * handling. What it cannot tell you is how many rows a browser actually
 * paints. That assertion lives in the Playwright suite, against a real box.
 */
const SIZES = { offsetWidth: 960, offsetHeight: VIEWPORT_HEIGHT };

const originals = Object.fromEntries(
  Object.keys(SIZES).map((name) => [
    name,
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
  ]),
);

beforeAll(() => {
  for (const [name, size] of Object.entries(SIZES)) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.testid === "event-grid" ? size : 0;
      },
    });
  }
});

afterAll(() => {
  for (const [name, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
  }
});

const ROWS = buildEvents(500);

function Harness({ initial = { key: "at", direction: "desc" } as Sort }) {
  const [sort, setSort] = useState<Sort>(initial);

  return <EventTable rows={ROWS} sort={sort} onSortChange={setSort} />;
}

describe("the grid contract", () => {
  it("tells assistive tech how many rows exist, not how many are rendered", () => {
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    // This is the whole accessibility problem with virtualisation. The DOM
    // holds a couple of dozen rows; the grid has to say 500 (501 with the
    // header row) or a screen reader announces "row 3 of 20" and lies.
    const grid = screen.getByRole("grid");
    expect(grid).toHaveAttribute("aria-rowcount", "500");
    expect(screen.getAllByRole("row").length).toBeLessThan(ROWS.length);
  });

  it("numbers rendered rows by their place in the data, offset past the header", () => {
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    const rows = screen.getAllByRole("row");
    expect(rows[0]).toHaveAttribute("aria-rowindex", "1");
    expect(rows[1]).toHaveAttribute("aria-rowindex", "2");
  });

  it("marks the sorted column and only that one", () => {
    render(
      <EventTable
        rows={ROWS}
        sort={{ key: "durationMs", direction: "asc" }}
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("columnheader", { name: /duration/i })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(screen.getByRole("columnheader", { name: /path/i })).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });

  it("shows the direction with an arrow as well as with aria-sort", () => {
    // aria-sort is invisible. A sighted mouse user needs to see which way
    // the column went, and the arrow is not announced twice because it is
    // aria-hidden.
    render(
      <EventTable rows={ROWS} sort={{ key: "path", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    expect(screen.getByRole("columnheader", { name: /path/i }).textContent).toContain("↓");
  });
});

describe("sorting from the header", () => {
  it("flips the active column on a second click", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ key: "path", direction: "asc" }} />);

    await user.click(screen.getByRole("button", { name: /path/i }));

    expect(screen.getByRole("columnheader", { name: /path/i })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("reaches the header buttons with the keyboard", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <EventTable
        rows={ROWS}
        sort={{ key: "at", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );

    // Two tabs: the grid itself is the first stop, and the header buttons
    // sit inside it.
    await user.tab();
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onSortChange).toHaveBeenCalledWith({ key: "at", direction: "asc" });
  });
});

describe("keyboard navigation through the rows", () => {
  it("is one tab stop rather than five hundred", () => {
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    // Every rendered row being focusable is the naive version, and it makes
    // the grid a keyboard trap you scroll out of.
    expect(screen.getByRole("grid")).toHaveAttribute("tabindex", "0");
    for (const row of screen.getAllByRole("row").slice(1)) {
      expect(row).not.toHaveAttribute("tabindex", "0");
    }
  });

  it("moves the active row with the arrow keys", async () => {
    const user = userEvent.setup();
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    const grid = screen.getByRole("grid");
    grid.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");

    const selected = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAttribute("aria-rowindex", "4");
  });

  it("jumps to the ends and clamps there", async () => {
    const user = userEvent.setup();
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    const grid = screen.getByRole("grid");
    grid.focus();
    await user.keyboard("{End}");
    expect(grid).toHaveAttribute("aria-activedescendant", expect.stringContaining("499"));

    await user.keyboard("{ArrowDown}");
    expect(grid).toHaveAttribute("aria-activedescendant", expect.stringContaining("499"));

    await user.keyboard("{Home}{ArrowUp}");
    expect(grid).toHaveAttribute("aria-activedescendant", expect.stringContaining("-0"));
  });

  it("does not swallow keys it has no use for", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(
      // A bare listener to observe what bubbles out of the grid. It is not
      // a control, and nothing in the test interacts with it directly.
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onKeyDown={onKeyDown}>
        <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />
      </div>,
    );

    screen.getByRole("grid").focus();
    await user.keyboard("{ArrowDown}");
    expect(onKeyDown.mock.calls[0]?.[0].defaultPrevented).toBe(true);

    await user.keyboard("a");
    expect(onKeyDown.mock.calls[1]?.[0].defaultPrevented).toBe(false);
  });
});

describe("what a row says", () => {
  it("gives the outcome an icon and a word, never a colour on its own", () => {
    render(
      <EventTable rows={ROWS} sort={{ key: "at", direction: "desc" }} onSortChange={vi.fn()} />,
    );

    const firstRow = screen.getAllByRole("row")[1]!;
    const outcome = within(firstRow).getAllByRole("gridcell").at(-1)!;

    expect(outcome.textContent).toMatch(/ok|slow|error/);
  });
});
