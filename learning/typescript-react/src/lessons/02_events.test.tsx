import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Events } from "./02_events";

const submitted = () => JSON.parse(screen.getByTestId("submitted").textContent ?? "null");

describe("form events", () => {
  it("reads the form through currentTarget", async () => {
    render(<Events />);

    await userEvent.type(screen.getByRole("textbox"), "ada@example.com");
    await userEvent.selectOptions(screen.getByRole("combobox"), "pro");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(submitted()).toEqual({ email: "ada@example.com", plan: "pro", newsletter: true });
  });

  it("treats an unticked checkbox as absent, not false", async () => {
    render(<Events />);

    await userEvent.type(screen.getByRole("textbox"), "ada@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // The distinction that matters: FormData has no "newsletter" key at all.
    expect(submitted().newsletter).toBe(false);
  });

  it("reads currentTarget on the button, not whatever was under the pointer", async () => {
    render(<Events />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByTestId("last-click")).toHaveTextContent(/^save at/);
  });
});
