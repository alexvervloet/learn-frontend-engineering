import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Dialog, FocusManagement, RemovableList } from "./03_focus_management";

/**
 * A parent that re-renders while its dialog is open, which the lesson's own
 * demo never does. `onClose` is a new arrow every time it renders, so an
 * effect that lists `onClose` as a dependency re-runs on each one: the cleanup
 * hands focus back to wherever the dialog was opened from, and the next run
 * drags it into the panel. The user loses the control they had tabbed to.
 *
 * The button lives inside the dialog so that clicking it is not itself a
 * reason for focus to move out.
 */
function ReRenderingParent() {
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Stays put">
      <button onClick={() => setTick((current) => current + 1)}>Bump ({tick})</button>
    </Dialog>
  );
}

describe("a dialog", () => {
  it("moves focus into itself when it opens", async () => {
    render(<FocusManagement />);

    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("names itself, so a screen reader says what it is", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));

    expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete everything?");
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });

  it("wraps Tab from the last control back to the first", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));
    const dialog = screen.getByRole("dialog");

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Confirm" })).toHaveFocus();

    // Without the trap, this lands on something behind the overlay.
    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  // This test used to tab forward first, so focus was on Cancel before the
  // Shift-Tab. That stepped straight over the case the trap got wrong: at the
  // moment it opens, focus is on the panel, which is neither the first nor the
  // last focusable thing, so the handler fell through to the browser and
  // Shift-Tab left the dialog for the button that opened it.
  it("wraps Shift-Tab out of the panel itself, the moment it opens", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();

    await userEvent.tab({ shift: true });

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(within(dialog).getByRole("button", { name: "Confirm" })).toHaveFocus();
  });

  it("wraps Shift-Tab the other way, which a one-way trap does not", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));
    const dialog = screen.getByRole("dialog");

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Confirm" })).toHaveFocus();
  });

  it("does not snatch focus back when its parent re-renders", async () => {
    render(<ReRenderingParent />);
    const bump = screen.getByRole("button", { name: /Bump/ });

    await userEvent.click(bump);

    // Still on the button the user was using, not dragged back to the panel.
    expect(screen.getByRole("button", { name: /Bump/ })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("gives focus back to the button that opened it", async () => {
    render(<FocusManagement />);
    const opener = screen.getByRole("button", { name: "Open the dialog" });

    await userEvent.click(opener);
    await userEvent.keyboard("{Escape}");

    // Without the restore, focus is on body and the next Tab starts at the top
    // of the page.
    expect(opener).toHaveFocus();
  });
});

describe("deleting the focused thing", () => {
  it("moves focus to the next row", async () => {
    render(<RemovableList />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Second" }));

    // Not body. "Third" has moved up into the position "Second" occupied.
    expect(await screen.findByRole("button", { name: "Remove Third" })).toHaveFocus();
  });

  it("moves focus to the previous row when the last one goes", async () => {
    render(<RemovableList />);

    await userEvent.click(screen.getByRole("button", { name: "Remove Third" }));

    expect(await screen.findByRole("button", { name: "Remove Second" })).toHaveFocus();
  });

  it("falls back to the Add button when the list empties", async () => {
    render(<RemovableList />);

    await userEvent.click(screen.getByRole("button", { name: "Remove First" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove Second" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove Third" }));

    expect(await screen.findByRole("button", { name: "Add an item" })).toHaveFocus();
  });

  it("never leaves focus on the body, which is the bug", async () => {
    render(<RemovableList />);

    await userEvent.click(screen.getByRole("button", { name: "Remove First" }));

    expect(document.activeElement).not.toBe(document.body);
  });
});
