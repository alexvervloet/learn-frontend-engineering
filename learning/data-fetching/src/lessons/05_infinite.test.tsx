import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithClient } from "../test-utils";
import { Infinite } from "./05_infinite";

const rows = () => within(screen.getByTestId("list")).getAllByRole("listitem");

async function loadMore() {
  await userEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByRole("button", { name: /Load more|That is all/ }, { timeout: 3000 });
}

describe("infinite queries", () => {
  it("appends a page rather than replacing the list", async () => {
    renderWithClient(<Infinite />);
    await screen.findByTestId("list", {}, { timeout: 3000 });
    expect(rows()).toHaveLength(3);

    await loadMore();

    expect(rows()).toHaveLength(6);
    // The first page is still there, which is what "append" means.
    expect(rows()[0]).toHaveTextContent("Rules of React");
  });

  it("stops when the server stops sending a cursor", async () => {
    renderWithClient(<Infinite />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await loadMore();
    await loadMore();

    // Seven bookmarks, three per page: the third page has one and no cursor.
    expect(rows()).toHaveLength(7);
    expect(screen.getByRole("button", { name: "That is all of them" })).toBeDisabled();
  });
});
