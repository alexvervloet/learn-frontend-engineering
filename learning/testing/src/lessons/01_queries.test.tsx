import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DivSoupPanel, SemanticPanel } from "./01_queries";

describe("the semantic panel", () => {
  it("is reachable by role, with its accessible name", () => {
    render(<SemanticPanel onSignIn={vi.fn()} />);

    // `name` is the accessible name, not the name attribute. This assertion
    // fails if the button stops being a button or stops being announced.
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("names its region, so a screen reader can skip to it", () => {
    render(<SemanticPanel onSignIn={vi.fn()} />);

    expect(screen.getByRole("region", { name: "Sign in" })).toBeInTheDocument();
  });

  it("refuses a click that a real user could not make", async () => {
    const onSignIn = vi.fn();
    render(<SemanticPanel onSignIn={onSignIn} />);

    // The button is disabled until there is an email. fireEvent.click would
    // dispatch the event anyway and the test would prove nothing.
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(onSignIn).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onSignIn).toHaveBeenCalledWith("ada@example.com");
  });

  it("can be operated entirely from the keyboard", async () => {
    const onSignIn = vi.fn();
    render(<SemanticPanel onSignIn={onSignIn} />);

    await userEvent.tab();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();

    await userEvent.keyboard("ada@example.com{Enter}");

    // Enter submits a form from inside a text input. No click needed.
    expect(onSignIn).toHaveBeenCalledWith("ada@example.com");
  });
});

describe("the div soup panel", () => {
  it("has no button, no textbox and no heading", () => {
    render(<DivSoupPanel onSignIn={vi.fn()} />);

    // Every one of these is how a screen reader would look for it.
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("cannot be reached with the keyboard", async () => {
    render(<DivSoupPanel onSignIn={vi.fn()} />);
    const soup = screen.getByTestId("soup-panel");
    const before = document.activeElement;

    await userEvent.tab();

    // contentEditable takes focus; the "button" never will. Tab lands on the
    // editable div and there is nowhere else to go.
    expect(within(soup).queryByTestId("soup-submit")).not.toHaveFocus();
    expect(document.activeElement).not.toBe(before);
  });

  it("passes a test written with test ids, which is the whole problem", async () => {
    const onSignIn = vi.fn();
    render(<DivSoupPanel onSignIn={onSignIn} />);

    await userEvent.click(screen.getByTestId("soup-submit"));

    // Green. The component is unusable.
    expect(onSignIn).toHaveBeenCalled();
  });
});
