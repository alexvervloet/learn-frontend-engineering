import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db } from "../api/db";
import { renderApp, testQueryClient } from "../test-utils";

describe("the detail page", () => {
  it("shows the bookmark", async () => {
    renderApp(["/bookmarks/1"], { queryClient: testQueryClient() });

    expect(
      await screen.findByRole(
        "heading",
        { name: "You Might Not Need an Effect" },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("clicks")).toHaveTextContent("12 clicks");
  });

  it("does not steal focus when it is the page you arrived on", async () => {
    renderApp(["/bookmarks/1"], { queryClient: testQueryClient() });

    const heading = await screen.findByRole(
      "heading",
      { name: "You Might Not Need an Effect" },
      { timeout: 3000 },
    );

    // On arrival the browser already has focus at the top of the document,
    // and moving it here would put the user past the skip link. The
    // navigation case is covered in flows.test.tsx.
    expect(heading).not.toHaveFocus();
  });

  it("tells a 404 apart from a failure", async () => {
    renderApp(["/bookmarks/9999"], { queryClient: testQueryClient() });

    // Not "Something went wrong". The client throws an error carrying the
    // status, which is the whole reason it does.
    expect(
      await screen.findByRole("heading", { name: "No such bookmark" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the list" })).toBeInTheDocument();
  });

  it("links each tag back to a filtered list", async () => {
    renderApp(["/bookmarks/2"], { queryClient: testQueryClient() });
    await screen.findByRole("heading", { name: "TanStack Query" }, { timeout: 3000 });

    expect(screen.getByRole("link", { name: "react" })).toHaveAttribute(
      "href",
      "/bookmarks?tag=react",
    );
  });
});

describe("deleting", () => {
  async function openDialog() {
    renderApp(["/bookmarks/3"], { queryClient: testQueryClient() });
    await screen.findByRole("heading", { name: "Cascade layers" }, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    return screen.getByRole("dialog");
  }

  it("asks first, and names itself", async () => {
    const dialog = await openDialog();

    expect(dialog).toHaveAccessibleName("Delete this bookmark?");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(db.find(3)).toBeDefined();
  });

  it("moves focus into the dialog and traps it both ways", async () => {
    const dialog = await openDialog();
    expect(dialog).toHaveFocus();

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Delete" })).toHaveFocus();

    // Without the trap this lands on something behind the overlay.
    await userEvent.tab();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

    // A one-way trap lets Shift-Tab out.
    await userEvent.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("closes on Escape and gives focus back", async () => {
    await openDialog();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Not the body: the next Tab would start at the top of the page.
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
  });

  it("deletes and returns to the list", async () => {
    const { router } = renderApp(["/bookmarks/3"], { queryClient: testQueryClient() });
    await screen.findByRole("heading", { name: "Cascade layers" }, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe("/bookmarks"), {
      timeout: 3000,
    });
    expect(db.find(3)).toBeUndefined();
  });

  it("reports a failed delete instead of pretending", async () => {
    db.failNextWrite(true);
    renderApp(["/bookmarks/3"], { queryClient: testQueryClient() });
    await screen.findByRole("heading", { name: "Cascade layers" }, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent(
      "Could not delete it",
    );
    // Still there, and the user is still on the page.
    expect(db.find(3)).toBeDefined();
  });
});
