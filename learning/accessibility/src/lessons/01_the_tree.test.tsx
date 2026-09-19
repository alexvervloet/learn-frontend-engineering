import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AccessibleDisclosure,
  IconButton,
  InaccessibleDisclosure,
  MislabelledButton,
} from "./01_the_tree";

describe("role", () => {
  it("exists for a button and not for a div", () => {
    const { unmount } = render(<AccessibleDisclosure />);
    expect(screen.getByRole("button", { name: "Shipping details" })).toBeInTheDocument();
    unmount();

    render(<InaccessibleDisclosure />);
    // Same text, same appearance, not in the tree as anything.
    expect(screen.queryByRole("button", { name: "Shipping details" })).not.toBeInTheDocument();
  });
});

describe("state", () => {
  it("is reported and kept in step", async () => {
    render(<AccessibleDisclosure />);
    const toggle = screen.getByRole("button", { name: "Shipping details" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);

    // The state and the DOM agree. aria-expanded that never changes is worse
    // than none at all.
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("accessible-panel")).toBeInTheDocument();
  });

  it("points at the panel it controls", async () => {
    render(<AccessibleDisclosure />);
    const toggle = screen.getByRole("button", { name: "Shipping details" });
    await userEvent.click(toggle);

    const controls = toggle.getAttribute("aria-controls") ?? "";
    expect(document.getElementById(controls)).toBe(screen.getByTestId("accessible-panel"));
  });

  it("is absent entirely from the div version", async () => {
    render(<InaccessibleDisclosure />);

    await userEvent.click(screen.getByTestId("soup-toggle"));

    // The panel opened. Nothing announced it, and nothing says it is open.
    expect(screen.getByTestId("soup-panel")).toBeInTheDocument();
    expect(screen.getByTestId("soup-toggle")).not.toHaveAttribute("aria-expanded");
  });
});

describe("keyboard, which comes with the role", () => {
  it("activates a real button with Space and Enter", async () => {
    render(<AccessibleDisclosure />);
    const toggle = screen.getByRole("button", { name: "Shipping details" });

    toggle.focus();
    await userEvent.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvent.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("cannot reach the div version at all", async () => {
    render(<InaccessibleDisclosure />);

    await userEvent.tab();

    // Nothing in this tree is focusable, so Tab leaves the component.
    expect(screen.getByTestId("soup-toggle")).not.toHaveFocus();
  });
});

describe("name", () => {
  it("comes from the content when there is content", () => {
    render(<AccessibleDisclosure />);

    expect(screen.getByRole("button")).toHaveAccessibleName("Shipping details");
  });

  it("needs aria-label when the content is a glyph", () => {
    render(<IconButton onClose={vi.fn()} />);

    // "✕" is not a name. Without the label this button is announced as
    // "button" and nothing else.
    expect(screen.getByRole("button")).toHaveAccessibleName("Close");
  });

  it("is overridden by aria-label, which is how voice control breaks", () => {
    render(<MislabelledButton />);

    // Someone says "click Save". The name is not "Save". Nothing happens.
    expect(screen.getByTestId("mislabelled")).toHaveTextContent("Save");
    expect(screen.getByRole("button")).toHaveAccessibleName("Save changes to the current document");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
