import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tabs } from "./04_what_not_to_test";

describe("the brittle version", () => {
  it("asserts a class name, and would fail on a rename that breaks nothing", async () => {
    render(<Tabs />);

    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));

    // Kept here as the example, not as advice. Rename `tab--active` to
    // `tab-active` and this fails while the component works perfectly. Nothing
    // a user can see has changed.
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveClass("tab--active");
  });
});

describe("the version worth having", () => {
  it("asserts what a screen reader is told", async () => {
    render(<Tabs />);

    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));

    // Delete aria-selected and this fails, and the component really is broken
    // for anyone not looking at the colours.
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
  });

  it("asserts the panel the user ends up reading", async () => {
    render(<Tabs />);

    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Settings content");
  });

  it("asserts the panel is labelled by its tab", async () => {
    render(<Tabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    const panel = screen.getByRole("tabpanel");
    const labelledBy = panel.getAttribute("aria-labelledby") ?? "";

    expect(document.getElementById(labelledBy)).toBe(screen.getByRole("tab", { name: "Settings" }));
  });

  it("keeps the tablist to one tab stop", async () => {
    render(<Tabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));

    // The roving tabindex pattern. Tab moves past the whole list, not through
    // every tab in it.
    expect(screen.getByRole("tab", { name: "Activity" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("tabindex", "-1");
  });

  it("tells the caller, which is the component's actual contract", async () => {
    const onSelect = vi.fn();
    render(<Tabs onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "Settings" }));

    expect(onSelect).toHaveBeenCalledWith("Settings");
  });
});

describe("snapshots, used the one way they work", () => {
  it("is fine for a small stable string", () => {
    const summarise = (tabs: readonly string[]) => `${tabs.length} tabs: ${tabs.join(", ")}`;

    // Inline, so the expected value is in the diff when it changes. A snapshot
    // of the whole component would fail on every intentional edit and be
    // updated with `u` rather than read.
    expect(summarise(["Overview", "Activity"])).toMatchInlineSnapshot(
      `"2 tabs: Overview, Activity"`,
    );
  });
});
