import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ListsAndKeys } from "./03_lists_and_keys";

// Grace is id 2 and sits at index 1. Removing Ada shifts Linus (id 3) into
// index 1, so an index key hands Linus the DOM node Grace was using.
async function typeIntoGraceAndRemoveFirstRow() {
  render(<ListsAndKeys />);

  await userEvent.type(screen.getByTestId("by-index-2"), "hello");
  await userEvent.type(screen.getByTestId("by-id-2"), "hello");
  await userEvent.click(screen.getByRole("button", { name: "Remove the first row" }));
}

describe("keys", () => {
  it("hands the wrong row's state over when the key is the index", async () => {
    await typeIntoGraceAndRemoveFirstRow();

    expect(screen.getByTestId("by-index-3")).toHaveValue("hello");
  });

  it("keeps state with its own row when the key is a stable id", async () => {
    await typeIntoGraceAndRemoveFirstRow();

    expect(screen.getByTestId("by-id-2")).toHaveValue("hello");
    expect(screen.getByTestId("by-id-3")).toHaveValue("");
  });
});
