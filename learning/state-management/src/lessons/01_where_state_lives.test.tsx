import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Lifted } from "./01_where_state_lives";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

describe("the cost of lifting", () => {
  it("re-renders a sibling that reads nothing", async () => {
    render(<Lifted />);
    const before = renders("bystander-renders");

    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "ab");

    // Two keystrokes, two re-renders of a component with no props and no state.
    // This is the number a store selector drives to zero.
    expect(renders("bystander-renders")).toBe(before + 2);
  });

  it("re-renders the component that does read it, which is the part you wanted", async () => {
    render(<Lifted />);
    const before = renders("reader-renders");

    await userEvent.type(screen.getByRole("textbox", { name: "Name" }), "ab");

    expect(renders("reader-renders")).toBe(before + 2);
    expect(screen.getByText(/Hello ab/)).toBeInTheDocument();
  });
});
