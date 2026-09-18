import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db } from "../api/db";
import { renderWithClient } from "../test-utils";
import { Mutations } from "./03_mutations";

async function add(title: string) {
  if (title !== "") await userEvent.type(screen.getByRole("textbox", { name: "Title" }), title);
  await userEvent.click(screen.getByRole("button", { name: "Add" }));
}

describe("mutations", () => {
  it("refetches the list after a write, without being told which rows changed", async () => {
    renderWithClient(<Mutations />);
    await screen.findByTestId("list", {}, { timeout: 3000 });
    expect(within(screen.getByTestId("list")).getAllByRole("listitem")).toHaveLength(7);

    await add("Suspense in practice");

    expect(
      await screen.findByText("Suspense in practice", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId("list")).getAllByRole("listitem")).toHaveLength(8);
  });

  it("shows the message the API sent, not a generic one", async () => {
    renderWithClient(<Mutations />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await add("");

    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent(
      "a title is required",
    );
  });

  it("leaves the list alone when the write fails", async () => {
    db.failNextWrite(true);
    renderWithClient(<Mutations />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await add("never saved");

    await screen.findByRole("alert", {}, { timeout: 3000 });
    expect(within(screen.getByTestId("list")).getAllByRole("listitem")).toHaveLength(7);
    expect(screen.queryByText("never saved")).not.toBeInTheDocument();
  });
});
