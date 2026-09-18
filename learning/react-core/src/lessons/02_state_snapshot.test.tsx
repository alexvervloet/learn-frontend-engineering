import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StateSnapshot } from "./02_state_snapshot";

const count = () => Number(screen.getByTestId("count").textContent);

describe("state is a snapshot", () => {
  it("adds one, not three, when each call reads this render's value", async () => {
    render(<StateSnapshot />);

    await userEvent.click(screen.getByRole("button", { name: "+3 by value (adds 1)" }));

    expect(count()).toBe(1);
  });

  it("adds three when each call reads the pending value", async () => {
    render(<StateSnapshot />);

    await userEvent.click(screen.getByRole("button", { name: "+3 by updater (adds 3)" }));

    expect(count()).toBe(3);
  });

  it("captures the value from the render that scheduled the timer", async () => {
    // shouldAdvanceTime is not optional here. user-event waits on its own
    // timers between keystrokes and clicks, and with the clock fully frozen
    // nothing ever advances it, so the first click never resolves and the test
    // times out at five seconds with no useful error.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    try {
      render(<StateSnapshot />);

      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("button", { name: "Read count in 1s" }));
      // Three more clicks land before the timer fires. The closure does not see them.
      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("button", { name: "+1" }));
      await user.click(screen.getByRole("button", { name: "+1" }));

      expect(count()).toBe(4);
      // The timer calls setState, so firing it has to happen inside act or
      // React has not committed the update by the time the assertion runs.
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(screen.getByTestId("captured")).toHaveTextContent("captured: 1");
    } finally {
      vi.useRealTimers();
    }
  });
});
