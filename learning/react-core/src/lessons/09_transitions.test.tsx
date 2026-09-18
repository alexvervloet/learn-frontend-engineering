import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Transitions } from "./09_transitions";

// What a test can honestly check here is correctness: no keystroke is lost, and
// the deferred list lands on the right answer. The part you can only feel is
// the latency, and that belongs in a Playwright trace, not in jsdom.
describe("deferred values", () => {
  it("keeps every character, even though each one triggers a 20,000 row filter", async () => {
    render(<Transitions />);
    const box = screen.getByRole("textbox");

    await userEvent.type(box, "199");

    expect(box).toHaveValue("199");
  });

  it("settles on results for the final query, not an intermediate one", async () => {
    render(<Transitions />);

    await userEvent.type(screen.getByRole("textbox"), "199");
    const rows = within(screen.getByTestId("rows")).getAllByRole("listitem");

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toHaveTextContent("199");
  });

  it("marks the list busy for assistive tech while it is behind, not just visually", async () => {
    render(<Transitions />);
    await userEvent.type(screen.getByRole("textbox"), "199");

    // Settled, so aria-busy is off. The attribute existing at all is the point:
    // dimming with opacity alone tells a screen reader nothing.
    expect(screen.getByTestId("rows")).toHaveAttribute("aria-busy", "false");
  });
});

describe("transitions", () => {
  it("switches tabs and reports the transition as finished", async () => {
    render(<Transitions />);

    await userEvent.click(screen.getByRole("button", { name: "About" }));

    expect(screen.getByRole("button", { name: "About" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("pending")).toHaveTextContent("idle");
  });
});
