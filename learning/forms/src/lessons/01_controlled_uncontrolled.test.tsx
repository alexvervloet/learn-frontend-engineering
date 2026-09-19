import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ControlledUncontrolled } from "./01_controlled_uncontrolled";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);
const submitted = () => JSON.parse(screen.getByTestId("submitted").textContent ?? "null");

describe("what each one costs", () => {
  it("re-renders once per keystroke when controlled", async () => {
    render(<ControlledUncontrolled />);
    const before = renders("c-renders");

    await userEvent.type(screen.getByRole("textbox", { name: "c-name" }), "Ada");

    expect(renders("c-renders")).toBe(before + 3);
  });

  it("does not re-render at all when uncontrolled", async () => {
    render(<ControlledUncontrolled />);
    const before = renders("u-renders");

    await userEvent.type(screen.getByRole("textbox", { name: "u-name" }), "Ada");

    // The DOM holds the value. React has not been told and does not need to be.
    expect(renders("u-renders")).toBe(before);
    expect(screen.getByRole("textbox", { name: "u-name" })).toHaveValue("Ada");
  });
});

describe("what each one can do", () => {
  it("can show a live count only when controlled", async () => {
    render(<ControlledUncontrolled />);

    await userEvent.type(screen.getByRole("textbox", { name: "c-name" }), "Ada");

    expect(screen.getByTestId("c-live")).toHaveTextContent("3/20");
  });

  it("can disable submit on emptiness only when controlled", async () => {
    render(<ControlledUncontrolled />);

    expect(screen.getByRole("button", { name: "Submit controlled" })).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox", { name: "c-name" }), "A");

    expect(screen.getByRole("button", { name: "Submit controlled" })).toBeEnabled();
    // The uncontrolled form cannot know, so its button is always enabled.
    expect(screen.getByRole("button", { name: "Submit uncontrolled" })).toBeEnabled();
  });
});

describe("reading the values", () => {
  it("submits the same shape from either form", async () => {
    render(<ControlledUncontrolled />);

    await userEvent.type(screen.getByRole("textbox", { name: "c-name" }), "Ada");
    await userEvent.type(screen.getByRole("textbox", { name: "c-email" }), "ada@example.com");
    await userEvent.click(screen.getByRole("checkbox", { name: "c-subscribed" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit controlled" }));

    const fromControlled = submitted();

    await userEvent.type(screen.getByRole("textbox", { name: "u-name" }), "Ada");
    await userEvent.type(screen.getByRole("textbox", { name: "u-email" }), "ada@example.com");
    await userEvent.click(screen.getByRole("checkbox", { name: "u-subscribed" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit uncontrolled" }));

    expect(submitted()).toEqual(fromControlled);
  });

  it("turns a missing checkbox into false rather than dropping the key", async () => {
    render(<ControlledUncontrolled />);

    await userEvent.type(screen.getByRole("textbox", { name: "u-name" }), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Submit uncontrolled" }));

    // FormData has no "subscribed" entry at all. The form has to decide what
    // that means, and every form gets this wrong at least once.
    expect(submitted().subscribed).toBe(false);
  });
});
