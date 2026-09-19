import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MeasureFirst, type Measurement } from "./01_measure_first";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

describe("the Profiler", () => {
  it("reports a mount for each subtree before any interaction", () => {
    const onMeasure = vi.fn<(m: Measurement) => void>();
    render(<MeasureFirst onMeasure={onMeasure} />);

    const ids = onMeasure.mock.calls.map(([m]) => m.id);
    expect(new Set(ids)).toEqual(new Set(["cheap", "slow"]));
    expect(onMeasure.mock.calls.every(([m]) => m.phase === "mount")).toBe(true);
  });

  it("measures the slow subtree as slower than the cheap one", () => {
    const measurements: Measurement[] = [];
    render(<MeasureFirst onMeasure={(m) => measurements.push(m)} />);

    const slow = measurements.find((m) => m.id === "slow");
    const cheap = measurements.find((m) => m.id === "cheap");

    expect(slow).toBeDefined();
    expect(cheap).toBeDefined();
    // This is the assertion a render count cannot make. The cheap panel will
    // re-render far more often and still cost less.
    expect(slow?.actualDuration).toBeGreaterThan(cheap?.actualDuration ?? Infinity);
  });

  it("reports an update phase when something actually changes", async () => {
    const measurements: Measurement[] = [];
    render(<MeasureFirst onMeasure={(m) => measurements.push(m)} />);
    measurements.length = 0;

    await userEvent.click(screen.getByRole("button", { name: "Re-render the cheap panel" }));

    expect(measurements.some((m) => m.phase === "update")).toBe(true);
  });
});

describe("what the render count does not tell you", () => {
  it("counts the cheap panel far more often than the slow one", async () => {
    render(<MeasureFirst onMeasure={() => undefined} />);
    const before = { cheap: renders("cheap-renders"), slow: renders("slow-renders") };

    for (let i = 0; i < 5; i += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Re-render the cheap panel" }));
    }

    // Five updates on the cheap side, none on the slow side. Ranking work by
    // render count would send you to optimise the wrong component.
    expect(renders("cheap-renders")).toBe(before.cheap + 5);
    expect(renders("slow-renders")).toBe(before.slow);
  });

  it("shows the measurement for the panel that matters", async () => {
    render(<MeasureFirst />);

    await userEvent.click(screen.getByRole("button", { name: /Change the slow panel/ }));
    await userEvent.click(screen.getByRole("button", { name: "Show the last measurement" }));

    expect(screen.getByTestId("last-measurement")).toHaveTextContent(/slow panel \w+: \d/);
  });
});
