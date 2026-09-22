import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActivityLesson } from "./14_activity";

const setups = (which: string) => Number(screen.getByTestId(`setups-${which}`).textContent);

async function openTab(name: string): Promise<void> {
  await userEvent.click(screen.getByTestId(`tab-${name}`));
}

/** Types into a panel, leaves for another tab, and comes back. */
async function typeThenLeaveAndReturn(panel: string, tab: string, text: string): Promise<void> {
  await openTab(tab);
  await userEvent.type(screen.getByTestId(`input-${panel}`), text);
  await openTab("unmounted");
  await openTab(tab);
}

describe("the two old options", () => {
  it("unmounting loses what the user typed and pays to set up again", async () => {
    render(<ActivityLesson />);

    await userEvent.type(screen.getByTestId("input-unmounted"), "half a search");
    await openTab("activity");
    await openTab("unmounted");

    expect(screen.getByTestId("input-unmounted")).toHaveValue("");
    expect(setups("unmounted")).toBe(2);
  });

  it("display:none keeps the state and never stops the work", async () => {
    render(<ActivityLesson />);
    const before = setups("css");

    await typeThenLeaveAndReturn("css", "hidden-with-css", "kept");

    expect(screen.getByTestId("input-css")).toHaveValue("kept");
    // The effect never tore down, so it never set up again. In a real panel
    // that is a socket that stayed open for a tab nobody was looking at.
    expect(setups("css")).toBe(before);
  });
});

describe("<Activity>", () => {
  /**
   * The whole feature in one assertion: the state survived and the effect did
   * not. Neither of the other two can produce this row.
   */
  it("keeps the state and tears the effects down anyway", async () => {
    render(<ActivityLesson />);

    await typeThenLeaveAndReturn("activity", "activity", "still here");

    expect(screen.getByTestId("input-activity")).toHaveValue("still here");
    expect(setups("activity")).toBeGreaterThan(1);
  });

  it("sets its effects up again every time it becomes visible", async () => {
    render(<ActivityLesson />);
    const before = setups("activity");

    await openTab("activity");
    await openTab("unmounted");
    await openTab("activity");

    // Twice more visible, twice more setup. An effect that treats mount as
    // "run once, forever" is broken by this, which is the discipline
    // StrictMode has been asking for all along.
    expect(setups("activity")).toBe(before + 2);
  });

  it("mounts its children while hidden, rather than deferring the work to the click", () => {
    render(<ActivityLesson />);

    // The starting tab is "unmounted", so the Activity panel is hidden. Its
    // input is in the tree regardless, which is what makes this a pre-render
    // and not a lazy mount.
    expect(screen.getByTestId("input-activity")).toBeInTheDocument();
    expect(screen.queryByTestId("input-unmounted")).toBeInTheDocument();
  });

  /**
   * Hidden children are hidden from assistive technology too, not merely
   * painted out. React marks the subtree, so a screen reader and
   * `getByRole` agree with the eye about what is on the page.
   */
  it("hides its subtree from the accessibility tree while it is hidden", async () => {
    render(<ActivityLesson />);

    await openTab("activity");
    expect(screen.getByRole("textbox", { name: /activity/ })).toBeVisible();

    await openTab("unmounted");
    expect(screen.queryByRole("textbox", { name: /activity/ })).not.toBeInTheDocument();
  });
});
