import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FieldArrayForm, isUsernameTaken } from "./05_field_arrays";

const rows = () => within(screen.getByTestId("lines")).getAllByRole("listitem");

async function addLine(label: string, index: number) {
  await userEvent.click(screen.getByRole("button", { name: "Add a line" }));
  await userEvent.type(screen.getByRole("textbox", { name: `Label ${index}` }), label);
}

describe("the availability check on its own", () => {
  it("answers for the names it knows about", async () => {
    await expect(isUsernameTaken("ada")).resolves.toBe(true);
    await expect(isUsernameTaken("  ADA  ")).resolves.toBe(true);
    await expect(isUsernameTaken("newcomer")).resolves.toBe(false);
  });
});

describe("async validation", () => {
  it("rejects a taken username", async () => {
    render(<FieldArrayForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "ada");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("that one is taken", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("accepts one that is free", async () => {
    const onValid = vi.fn();
    render(<FieldArrayForm onValid={onValid} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "newcomer");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onValid).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(onValid.mock.calls[0]?.[0]).toMatchObject({ username: "newcomer" });
  });

  it("marks the field invalid for assistive tech, not just in red", async () => {
    render(<FieldArrayForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "grace");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("that one is taken", {}, { timeout: 3000 });
    expect(screen.getByRole("textbox", { name: "Username" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});

describe("field arrays", () => {
  it("adds and removes rows", async () => {
    render(<FieldArrayForm />);
    expect(rows()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Add a line" }));
    expect(rows()).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
    expect(rows()).toHaveLength(1);
  });

  it("keeps each value with its own row when one is removed", async () => {
    render(<FieldArrayForm />);
    await addLine("Mouse", 2);
    await addLine("Monitor", 3);

    // Remove the first row. With key={index} the surviving inputs would keep
    // the DOM nodes of the rows above them, and the values would shift up.
    await userEvent.click(screen.getByRole("button", { name: "Remove line 1" }));

    expect(rows()).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Label 1" })).toHaveValue("Mouse");
    expect(screen.getByRole("textbox", { name: "Label 2" })).toHaveValue("Monitor");
  });

  it("renumbers the registered names, so submit gets the right order", async () => {
    const onValid = vi.fn();
    render(<FieldArrayForm onValid={onValid} />);
    await addLine("Mouse", 2);

    await userEvent.click(screen.getByRole("button", { name: "Remove line 1" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Username" }), "newcomer");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onValid).toHaveBeenCalledOnce(), { timeout: 3000 });
    expect(onValid.mock.calls[0]?.[0].lines).toEqual([{ label: "Mouse", quantity: 1 }]);
  });

  it("moves a row without taking its value with the position", async () => {
    render(<FieldArrayForm />);
    await addLine("Mouse", 2);

    await userEvent.click(screen.getByRole("button", { name: "Move line 2 up" }));

    expect(screen.getByRole("textbox", { name: "Label 1" })).toHaveValue("Mouse");
    expect(screen.getByRole("textbox", { name: "Label 2" })).toHaveValue("Keyboard");
  });
});
