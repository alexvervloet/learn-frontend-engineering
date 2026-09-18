import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Refs } from "./03_refs";

describe("DOM refs", () => {
  it("reaches the input through a ref passed as an ordinary prop", async () => {
    render(<Refs />);

    await userEvent.click(screen.getByRole("button", { name: "Focus it" }));

    // Field takes `ref` with no forwardRef. Under React 18 this was a no-op
    // plus a console warning.
    expect(screen.getByRole("textbox", { name: "Target" })).toHaveFocus();
  });
});

describe("value refs", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts without rendering, and shows the count only when asked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Refs />);

    await user.click(screen.getByRole("button", { name: "Start the timer" }));
    await vi.advanceTimersByTimeAsync(350);

    // Three ticks have happened and the screen has not moved.
    expect(screen.getByTestId("ticks")).toHaveTextContent("shown: 0");

    await user.click(screen.getByRole("button", { name: "Read the tick count" }));
    expect(screen.getByTestId("ticks")).toHaveTextContent("shown: 3");
  });

  it("clears the interval it stored, rather than leaking it", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Refs />);

    await user.click(screen.getByRole("button", { name: "Start the timer" }));
    await vi.advanceTimersByTimeAsync(200);
    await user.click(screen.getByRole("button", { name: "Stop the timer" }));
    await vi.advanceTimersByTimeAsync(1000);

    await user.click(screen.getByRole("button", { name: "Read the tick count" }));
    expect(screen.getByTestId("ticks")).toHaveTextContent("shown: 2");
  });
});
