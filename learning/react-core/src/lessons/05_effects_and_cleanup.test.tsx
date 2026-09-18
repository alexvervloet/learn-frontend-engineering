import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EffectsAndCleanup } from "./05_effects_and_cleanup";

const ticks = (testId: string) => Number(screen.getByTestId(testId).textContent);

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("effect cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves the old interval running when the effect returns nothing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EffectsAndCleanup />);

    await user.click(screen.getByRole("button", { name: "500ms" }));
    await advance(1000);

    // One tick from the 1000ms interval nobody cleared, plus two from the new
    // 500ms one.
    expect(ticks("leaky-ticks")).toBe(3);
  });

  it("tears the old interval down when the effect returns a cleanup", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EffectsAndCleanup />);

    await user.click(screen.getByRole("button", { name: "500ms" }));
    await advance(1000);

    expect(ticks("clean-ticks")).toBe(2);
  });

  it("gets further apart with every change, which is what makes it a leak", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<EffectsAndCleanup />);

    await user.click(screen.getByRole("button", { name: "500ms" }));
    await user.click(screen.getByRole("button", { name: "250ms" }));
    await advance(1000);

    expect(ticks("leaky-ticks")).toBeGreaterThan(ticks("clean-ticks"));
    expect(ticks("clean-ticks")).toBe(4);
  });
});
