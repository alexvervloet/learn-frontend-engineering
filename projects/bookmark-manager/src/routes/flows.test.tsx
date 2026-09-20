import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db } from "../api/db";
import { renderApp, testQueryClient } from "../test-utils";

/**
 * The journeys, through the real route table and the real query client.
 *
 * The other files test a route or a component; these test that the pieces
 * are wired to each other, which is where the bugs that survive unit tests
 * live: a stale list after a write, a navigation to the wrong id, a cache
 * that was never invalidated.
 */
async function addBookmark(values: { title: string; url: string; tags?: string }) {
  await userEvent.type(screen.getByLabelText("Title"), values.title);
  await userEvent.type(screen.getByLabelText("URL"), values.url);
  if (values.tags !== undefined) await userEvent.type(screen.getByLabelText("Tags"), values.tags);
  await userEvent.click(screen.getByRole("button", { name: "Add it" }));
}

describe("adding a bookmark", () => {
  it("creates it and goes to its page", async () => {
    const { router } = renderApp(["/bookmarks/new"], { queryClient: testQueryClient() });

    await addBookmark({ title: "Inline snapshots", url: "https://vitest.dev" });

    await waitFor(() => expect(router.state.location.pathname).toBe("/bookmarks/7"), {
      timeout: 3000,
    });
    expect(
      await screen.findByRole("heading", { name: "Inline snapshots" }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("shows up in the list, because the mutation invalidated it", async () => {
    const { router } = renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("link", { name: "Add" }));
    await addBookmark({ title: "Inline snapshots", url: "https://vitest.dev" });
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/bookmarks\/\d+$/), {
      timeout: 3000,
    });

    await userEvent.click(screen.getByRole("link", { name: "All" }));

    // Nobody told the list; the create mutation invalidated the key prefix.
    expect(
      await screen.findByRole("link", { name: "Inline snapshots" }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it("creates the tags it was given", async () => {
    renderApp(["/bookmarks/new"], { queryClient: testQueryClient() });

    await addBookmark({
      title: "Inline snapshots",
      url: "https://vitest.dev",
      tags: "Vitest, TESTING",
    });

    await waitFor(() => expect(db.find(7)).toBeDefined(), { timeout: 3000 });
    // Lowercased and de-duplicated against the existing "testing" tag.
    expect(
      db
        .find(7)
        ?.tags.map((tag) => tag.name)
        .sort(),
    ).toEqual(["testing", "vitest"]);
  });

  it("keeps the user on the form when the server rejects it", async () => {
    db.failNextWrite(true);
    const { router } = renderApp(["/bookmarks/new"], { queryClient: testQueryClient() });

    await addBookmark({ title: "Inline snapshots", url: "https://vitest.dev" });

    expect(await screen.findByTestId("form-errors", {}, { timeout: 3000 })).toHaveTextContent(
      "The server refused it",
    );
    expect(router.state.location.pathname).toBe("/bookmarks/new");
  });
});

describe("editing", () => {
  it("loads the current values into the form", async () => {
    renderApp(["/bookmarks/1/edit"], { queryClient: testQueryClient() });

    await waitFor(
      () => expect(screen.getByLabelText("Title")).toHaveValue("You Might Not Need an Effect"),
      { timeout: 3000 },
    );
    expect(screen.getByLabelText("Tags")).toHaveValue("react");
  });

  it("saves and shows the new title everywhere", async () => {
    const { router } = renderApp(["/bookmarks/1/edit"], { queryClient: testQueryClient() });
    await waitFor(
      // toHaveValue compares exactly; it does not take a regex for an input.
      () => expect(screen.getByLabelText("Title")).toHaveValue("You Might Not Need an Effect"),
      { timeout: 3000 },
    );

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "You probably do not need an effect");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/bookmarks/1"), {
      timeout: 3000,
    });
    expect(
      await screen.findByRole(
        "heading",
        { name: "You probably do not need an effect" },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });
});

describe("navigation", () => {
  it("keeps the layout mounted between pages", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });
    const nav = screen.getByRole("navigation", { name: "Main" });

    await userEvent.click(screen.getByRole("link", { name: "TanStack Query" }));
    await screen.findByRole("heading", { name: "TanStack Query" }, { timeout: 3000 });

    // The same DOM node. That is what a layout route buys.
    expect(screen.getByRole("navigation", { name: "Main" })).toBe(nav);
  });

  it("has a skip link as the first tab stop on arrival", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.tab();

    // The heading deliberately does *not* take focus on the first render:
    // doing so puts the user past the skip link, which is the one thing on
    // the page a keyboard user most wants.
    expect(screen.getByRole("link", { name: "Skip to the content" })).toHaveFocus();
  });

  it("moves focus to the heading on a navigation, though", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("link", { name: "TanStack Query" }));

    const heading = await screen.findByRole(
      "heading",
      { name: "TanStack Query" },
      { timeout: 3000 },
    );
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it("catches an unknown path", async () => {
    renderApp(["/nowhere"], { queryClient: testQueryClient() });

    expect(await screen.findByTestId("not-found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to your bookmarks" })).toBeInTheDocument();
  });

  it("redirects the root to the list", async () => {
    const { router } = renderApp(["/"], { queryClient: testQueryClient() });

    await waitFor(() => expect(router.state.location.pathname).toBe("/bookmarks"));
  });
});
