import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as analytics from "../analytics";
import { SearchBox } from "./03_mocking";

/**
 * `vi.hoisted` is not optional when a `vi.mock` factory needs a variable.
 * `vi.mock` is hoisted above the imports, so a plain `const spy = vi.fn()`
 * further down does not exist yet and you get "Cannot access 'spy' before
 * initialization" from a line that looks correct.
 *
 * This file does not mock the analytics module: it spies on it, which keeps the
 * real implementation and is enough here. The hoisted form is shown because it
 * is the thing people lose an hour to.
 */
describe("vi.fn for a collaborator", () => {
  it("records what the component called it with", async () => {
    const onChange = vi.fn();

    render(
      <label>
        Name
        <input onChange={(event) => onChange(event.target.value)} />
      </label>,
    );

    await userEvent.type(screen.getByLabelText("Name"), "ab");

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith("ab");
  });
});

describe("vi.spyOn for something real", () => {
  beforeEach(() => {
    analytics.clearEvents();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("watches a call without replacing the module", async () => {
    const trackSpy = vi.spyOn(analytics, "track");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SearchBox />);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "keys");
    await vi.advanceTimersByTimeAsync(400);

    expect(trackSpy).toHaveBeenCalledWith("search", { query: "keys" });
    // The real implementation still ran, because spyOn keeps it.
    expect(analytics.sentEvents()).toHaveLength(1);
  });

  it("sends one event for a word, not one per keystroke", async () => {
    const trackSpy = vi.spyOn(analytics, "track");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SearchBox />);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "keys");
    await vi.advanceTimersByTimeAsync(400);

    // Four keystrokes. A broken debounce sends four events and nothing else in
    // the UI looks any different, so this is the only test that would catch it.
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });

  it("cancels the pending call when the query changes again", async () => {
    const trackSpy = vi.spyOn(analytics, "track");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<SearchBox />);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "ke");
    await vi.advanceTimersByTimeAsync(100);
    await user.type(screen.getByRole("textbox", { name: "Search" }), "ys");
    await vi.advanceTimersByTimeAsync(400);

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith("search", { query: "keys" });
  });

  it("restores the original afterwards", () => {
    const trackSpy = vi.spyOn(analytics, "track");
    expect(vi.isMockFunction(analytics.track)).toBe(true);

    trackSpy.mockRestore();

    // Without this, a spy leaks into every later test in the file.
    expect(vi.isMockFunction(analytics.track)).toBe(false);
  });
});

describe("fake timers", () => {
  it("need shouldAdvanceTime or user-event deadlocks", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchBox debounceMs={50} />);

      // With a fully frozen clock this line never resolves and the test dies
      // on Vitest's five-second timeout with no useful message.
      await user.type(screen.getByRole("textbox", { name: "Search" }), "x");
      // Inside act, because the timer sets state. The assertions further up
      // this file are about a spy, so they did not need it; this one is about
      // the DOM, so it does.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });

      expect(screen.getByTestId("searched")).toHaveTextContent("searched: x");
    } finally {
      vi.useRealTimers();
    }
  });
});
