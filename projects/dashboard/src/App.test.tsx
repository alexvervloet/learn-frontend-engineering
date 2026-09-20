import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("the date range", () => {
  it("starts on 30 days and says so with aria-pressed, not with a colour", () => {
    render(<App />);

    const group = screen.getByRole("group", { name: /date range/i });
    expect(within(group).getByRole("button", { name: "30 days" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "7 days" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("changes the headline number, not only the chart", async () => {
    const user = userEvent.setup();
    render(<App />);

    const views = screen.getByText("Page views").parentElement!;
    const before = views.textContent;

    await user.click(screen.getByRole("button", { name: "7 days" }));

    expect(views.textContent).not.toBe(before);
  });

  it("compares against the period before it, which is what a delta has to mean", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "7 days" }));
    expect(screen.getByText(/vs the previous 7 days/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "90 days" }));
    // 90 days of data cannot be compared to the 90 before it, so the tile
    // shows no delta rather than a made-up one.
    expect(screen.queryByText(/vs the previous 90 days/)).not.toBeInTheDocument();
  });
});

describe("the table view of the chart", () => {
  it("is reachable, because a chart is not the only way to publish numbers", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /show the table/i }));

    const table = screen.getByRole("table", { name: /page views by channel/i });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("goes back to the chart", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /show the table/i }));
    await user.click(screen.getByRole("button", { name: /show the chart/i }));

    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });
});

describe("filtering the events", () => {
  it("narrows the row count as you type", async () => {
    const user = userEvent.setup();
    render(<App />);

    // aria-rowcount, not the visible "10,000": the stat tile shows the same
    // number, so matching on the text asserts against whichever came first.
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", "10000");

    await user.type(screen.getByRole("textbox", { name: /filter/i }), "/pricing");

    const matches = Number(screen.getByRole("grid").getAttribute("aria-rowcount"));
    expect(matches).toBeGreaterThan(0);
    expect(matches).toBeLessThan(10_000);
  });

  it("combines the text filter with the outcome filter", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole("combobox", { name: /outcome/i }), "error");
    const errorsOnly = Number(screen.getByRole("grid").getAttribute("aria-rowcount"));

    await user.type(screen.getByRole("textbox", { name: /filter/i }), "/docs");
    const narrowed = Number(screen.getByRole("grid").getAttribute("aria-rowcount"));

    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThan(errorsOnly);
  });
});

describe("getting around", () => {
  it("has a skip link that points at a focusable main", () => {
    render(<App />);

    const skip = screen.getByRole("link", { name: /skip to the content/i });
    const target = document.querySelector(skip.getAttribute("href")!);

    // A skip link that lands on a div nobody can focus moves the scroll
    // position and leaves focus where it was.
    expect(target).toBe(screen.getByRole("main"));
    expect(target).toHaveAttribute("tabindex", "-1");
  });

  it("has one h1 and puts the sections under it", () => {
    render(<App />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(1);
  });
});
