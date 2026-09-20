import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { TrafficChart } from "./TrafficChart";
import { CHANNELS, buildSeries, type Channel } from "../data/series";

const POINTS = buildSeries(30);

function axisLabels(): string[] {
  // The y-axis ticks only. Picking up every <text> would also collect the
  // direct end labels, one of which disappears with the series, and the
  // test would pass or fail for the wrong reason.
  return screen.getAllByTestId("axis-label").map((node) => node.textContent ?? "");
}

function Harness() {
  const [hidden, setHidden] = useState<Set<Channel>>(new Set());

  return (
    <TrafficChart
      points={POINTS}
      hidden={hidden}
      onToggle={(channel) =>
        setHidden((current) => {
          const next = new Set(current);
          if (next.has(channel)) next.delete(channel);
          else next.add(channel);
          return next;
        })
      }
    />
  );
}

function renderChart(hidden: Channel[] = []) {
  return render(<TrafficChart points={POINTS} hidden={new Set(hidden)} onToggle={vi.fn()} />);
}

describe("identity", () => {
  it("keeps a legend for three series and direct-labels them too", () => {
    renderChart();

    // Colour alone is never the only way to tell the lines apart, and with
    // four or fewer series the end label saves the trip to the legend.
    expect(screen.getByTestId("legend")).toBeInTheDocument();
    for (const channel of CHANNELS) {
      expect(screen.getByTestId(`end-label-${channel}`)).toBeInTheDocument();
    }
  });

  it("describes itself to a screen reader instead of being an unlabelled graphic", () => {
    renderChart();

    const chart = screen.getByRole("img", { name: /page views by channel/i });
    expect(chart).toBe(screen.getByTestId("chart"));
    expect(chart.getAttribute("aria-labelledby")?.split(" ")).toHaveLength(2);
  });
});

describe("hiding a series", () => {
  it("drops its line and its label", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(screen.queryByTestId("line-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("end-label-search")).not.toBeInTheDocument();
    expect(screen.getByTestId("line-direct")).toBeInTheDocument();
  });

  it("does not rescale the axis under the reader", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const before = axisLabels();

    // Search is the largest series. Rescaling to the remainder would make
    // every surviving line jump upward and look like growth.
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(axisLabels()).toEqual(before);
  });

  it("leaves the hidden series in the legend, pressed-off, so it can come back", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole("button", { name: /search/i });
    expect(toggle).toHaveAttribute("aria-pressed", "true");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: /search/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("keeps each channel's colour when the others go, because colour follows the entity", () => {
    const alone = renderChart(["direct", "search"]);
    const stroke = alone.getByTestId("line-referral").getAttribute("stroke");
    alone.unmount();

    // A palette assigned by rank would repaint referral as series one here.
    renderChart();
    expect(screen.getByTestId("line-referral")).toHaveAttribute("stroke", stroke);
  });
});

describe("the tooltip", () => {
  it("starts as a prompt rather than as an empty box that shifts the layout", () => {
    renderChart();

    expect(screen.getByTestId("tooltip")).toHaveTextContent(/hover the chart/i);
  });

  it("is a live region, so a value read on hover is announced", () => {
    renderChart();

    const tooltip = screen.getByTestId("tooltip");
    expect(tooltip).toHaveAttribute("role", "status");
    expect(tooltip).toHaveAttribute("aria-live", "polite");
  });

  // Hovering needs real geometry: the pointer x is mapped back through the
  // SVG's bounding box, which jsdom reports as zero-width. That test is in
  // the Playwright suite.
});

describe("marks", () => {
  it("draws straight segments, never a smoothed curve through the data", () => {
    renderChart();

    // A spline invents values between the points and can dip below zero
    // between two positive days.
    for (const channel of CHANNELS) {
      expect(screen.getByTestId(`line-${channel}`).getAttribute("d")).not.toMatch(/[CQSTA]/);
    }
  });

  it("keeps the grid thinner than the data", () => {
    renderChart();

    const chart = screen.getByTestId("chart");
    const gridWidth = Number(chart.querySelector("line")?.getAttribute("stroke-width"));
    const lineWidth = Number(screen.getByTestId("line-direct").getAttribute("stroke-width"));

    expect(gridWidth).toBeLessThan(lineWidth);
  });
});
