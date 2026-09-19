import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { FocusManagement, RemovableList } from "./03_focus_management";

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

  it("wraps Shift-Tab the other way, which a one-way trap does not", async () => {
    render(<FocusManagement />);
    await userEvent.click(screen.getByRole("button", { name: "Open the dialog" }));
    const dialog = screen.getByRole("dialog");

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Confirm" })).toHaveFocus();
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
