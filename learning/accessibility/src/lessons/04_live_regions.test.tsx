import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveRegions } from "./04_live_regions";

/**
 * jsdom does not speak, so nothing here proves a screen reader announced
 * anything. What it can prove is the structure that decides whether it will:
 * the region exists before the content, and it has the right politeness. Those
 * two are where the bugs are.
 */
describe("the region exists before the content", () => {
  it("renders an empty status region on mount", () => {
    render(<LiveRegions />);

    // Present and empty. A screen reader registers it now and watches it.
    const region = screen.getByTestId("saved-region");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });

  it("changes the text of the same node rather than adding one", async () => {
    render(<LiveRegions />);
    const before = screen.getByTestId("saved-region");

    await userEvent.click(screen.getByRole("button", { name: "Save (polite)" }));

    // Same DOM node, new text. That is what gets announced.
    expect(screen.getByTestId("saved-region")).toBe(before);
    expect(before).toHaveTextContent(/Saved at/);
  });

  it("shows the bug in the conditional version", async () => {
    render(<LiveRegions />);

    // Not in the tree at all, so there is nothing for a screen reader to have
    // registered and nothing to watch for changes.
    expect(screen.queryByTestId("conditional-region")).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Save (conditionally rendered region)" }),
    );

    // It appears with its content: a new node, not a change to a watched one.
    expect(screen.getByTestId("conditional-region")).toBeInTheDocument();
  });
});

describe("politeness", () => {
  it("uses status for the ordinary case", () => {
    render(<LiveRegions />);

    expect(screen.getByTestId("saved-region")).toHaveAttribute("role", "status");
  });

  it("reserves alert for the thing the user has to hear", () => {
    render(<LiveRegions />);

    expect(screen.getByTestId("failed-region")).toHaveAttribute("role", "alert");
  });

  it("reads the whole count region on change, not just the delta", () => {
    render(<LiveRegions />);

    // "3 results for re" makes sense read whole. A log being appended to would
    // not, which is when to leave aria-atomic off.
    expect(screen.getByTestId("count-region")).toHaveAttribute("aria-atomic", "true");
  });
});

describe("not announcing on every keystroke", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for typing to stop before updating the count", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<LiveRegions />);

    await user.type(screen.getByRole("textbox", { name: "Search" }), "re");

    // The results are on screen immediately; the announcement is not. A
    // polite region updated per keystroke is announced per keystroke.
    expect(screen.getByTestId("results")).toHaveTextContent("react");
    expect(screen.getByTestId("count-region")).toBeEmptyDOMElement();

    // Inside act: the timer sets state, and without it React has not
    // committed by the time the assertion runs.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(screen.getByTestId("count-region")).toHaveTextContent("5 results for re");
  });
});
