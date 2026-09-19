import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { THRESHOLDS, WebVitals, rating } from "./04_web_vitals";

/**
 * The metrics themselves cannot be measured here: jsdom paints nothing, so
 * there is no LCP, no interaction latency and no layout to shift. What can be
 * checked is the bucketing, which is the part that decides whether a dashboard
 * shows green or red, and the markup that avoids the shift in the first place.
 */
describe("rating", () => {
  it("is inclusive at the good boundary", () => {
    // Exactly 2500ms is a pass, not a near miss. Off-by-one here is the
    // difference between a green dashboard and a red one.
    expect(rating("LCP", 2500)).toBe("good");
    expect(rating("LCP", 2501)).toBe("needs-improvement");
  });

  it("is inclusive at the poor boundary too", () => {
    expect(rating("INP", 500)).toBe("needs-improvement");
    expect(rating("INP", 501)).toBe("poor");
  });

  it("handles CLS, which is unitless and much smaller", () => {
    expect(rating("CLS", 0)).toBe("good");
    expect(rating("CLS", 0.1)).toBe("good");
    expect(rating("CLS", 0.2)).toBe("needs-improvement");
    expect(rating("CLS", 0.3)).toBe("poor");
  });

  it("buckets every metric it knows about", () => {
    for (const name of Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]) {
      const [good, poor] = THRESHOLDS[name];

      expect(rating(name, good)).toBe("good");
      expect(rating(name, (good + poor) / 2)).toBe("needs-improvement");
      expect(rating(name, poor * 2)).toBe("poor");
    }
  });

  it("uses the published thresholds, not invented ones", () => {
    expect(THRESHOLDS.LCP).toEqual([2500, 4000]);
    expect(THRESHOLDS.INP).toEqual([200, 500]);
    expect(THRESHOLDS.CLS).toEqual([0.1, 0.25]);
  });
});

describe("the layout shift demo", () => {
  it("reserves the space before the content arrives", async () => {
    render(<WebVitals />);

    // Reserved by default, so inserting the banner moves nothing. jsdom
    // normalises rem to px on the way in, so the assertion has to be in the
    // units it stores rather than the ones the component wrote.
    expect(screen.getByTestId("reserved")).toHaveStyle("min-height: 48px");

    await userEvent.click(screen.getByRole("checkbox"));

    // Unticked: nothing is holding the space, so the banner will push.
    expect(screen.getByTestId("reserved").style.minHeight).toBe("");
  });

  it("inserts and removes the late banner", async () => {
    render(<WebVitals />);

    await userEvent.click(screen.getByRole("button", { name: "Insert a late banner" }));
    expect(screen.getByText(/arrived after paint/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove a late banner" }));
    expect(screen.queryByText(/arrived after paint/)).not.toBeInTheDocument();
  });
});

describe("the thresholds table", () => {
  it("lists every metric the module rates", () => {
    render(<WebVitals />);

    const rows = within(screen.getByTestId("thresholds")).getAllByRole("row");
    expect(rows).toHaveLength(Object.keys(THRESHOLDS).length + 1);
  });
});
