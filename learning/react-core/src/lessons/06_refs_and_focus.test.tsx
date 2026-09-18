import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { RefsAndFocus } from "./06_refs_and_focus";

describe("refs", () => {
  it("moves the keyboard to the field, which is the whole reason for a DOM ref", async () => {
    render(<RefsAndFocus />);

    await userEvent.click(screen.getByRole("button", { name: "Focus the field" }));

    // The ref is passed as an ordinary prop through TextField. In React 18 this
    // test would fail without forwardRef.
    expect(screen.getByRole("textbox", { name: "Target" })).toHaveFocus();
  });

  it("does not re-render when a ref changes", async () => {
    render(<RefsAndFocus />);

    await userEvent.click(screen.getByRole("button", { name: "Increment the ref" }));
    await userEvent.click(screen.getByRole("button", { name: "Increment the ref" }));

    expect(screen.getByTestId("ref-count")).toHaveTextContent("0");
  });

  it("shows the ref's real value once something else causes a render", async () => {
    render(<RefsAndFocus />);

    await userEvent.click(screen.getByRole("button", { name: "Increment the ref" }));
    await userEvent.click(screen.getByRole("button", { name: "Increment the ref" }));
    await userEvent.click(screen.getByRole("button", { name: "Increment the state" }));

    expect(screen.getByTestId("ref-count")).toHaveTextContent("2");
    expect(screen.getByTestId("state-count")).toHaveTextContent("1");
  });
});
