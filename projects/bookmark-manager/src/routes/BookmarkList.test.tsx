import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db } from "../api/db";
import { renderApp, testQueryClient } from "../test-utils";
import { readFilters, writeFilters } from "./filters";

const rows = () => within(screen.getByTestId("bookmarks")).getAllByRole("listitem");
const search = (router: { state: { location: { search: string } } }) =>
  router.state.location.search;

async function goBack(router: { navigate: (delta: number) => Promise<void> | void }) {
  await act(async () => {
    await router.navigate(-1);
  });
}

describe("reading and writing filters", () => {
  it("reads the URL rather than keeping a copy", () => {
    expect(readFilters(new URLSearchParams("tag=react&favorite=true&page=3"))).toEqual({
      tag: "react",
      favorite: true,
      page: 3,
    });
  });

  it("repairs nonsense instead of propagating it", () => {
    // A hand-edited URL, a stale bookmark, a bad link in an email.
    expect(readFilters(new URLSearchParams("page=banana")).page).toBe(1);
    expect(readFilters(new URLSearchParams("page=-4")).page).toBe(1);
  });

  it("leaves defaults out of the query string", () => {
    expect(writeFilters(new URLSearchParams(), { tag: null }).toString()).toBe("");
    expect(writeFilters(new URLSearchParams(), { page: 1 }).toString()).toBe("");
    expect(writeFilters(new URLSearchParams(), { page: 2 }).toString()).toBe("page=2");
  });

  it("clears the page when the filter changes", () => {
    // Otherwise you land on page 3 of a one-page result and see nothing.
    const next = writeFilters(new URLSearchParams("page=3&tag=css"), { tag: "react" });

    expect(next.get("page")).toBeNull();
    expect(next.get("tag")).toBe("react");
  });
});

describe("the list", () => {
  it("renders what the API returned", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });

    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });
    expect(rows()).toHaveLength(5);
    expect(screen.getByRole("link", { name: "You Might Not Need an Effect" })).toBeInTheDocument();
  });

  it("announces the count in a region that existed before it did", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });

    // Present and empty on the first render, so a screen reader has something
    // registered to watch. Scoped by test id, because the loading spinner is
    // also a status region and an unscoped role query finds both.
    expect(screen.getByTestId("count-region")).toBeEmptyDOMElement();

    await waitFor(() =>
      expect(screen.getByTestId("count-region")).toHaveTextContent("5 bookmarks"),
    );
  });

  it("filters by tag, and says so in the URL", async () => {
    const { router } = renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "css" }));

    expect(search(router)).toBe("?tag=css");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.getByRole("link", { name: "Cascade layers" })).toBeInTheDocument();
  });

  it("follows the Back button, because nothing was copied into state", async () => {
    const { router } = renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "css" }));
    expect(search(router)).toBe("?tag=css");

    await goBack(router);

    // A useState copy would still be showing the css filter here.
    expect(search(router)).toBe("");
    expect(screen.getByRole("button", { name: "all" })).toHaveAttribute("aria-pressed", "true");
  });

  it("pages, and knows when there is no next page", async () => {
    const { router } = renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    // Six seeded bookmarks, five per page.
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(search(router)).toBe("?page=2");

    await waitFor(() => expect(rows()).toHaveLength(1));
    // The API returns a bare array, so "is there more" comes from asking for
    // one extra row rather than from a total the server does not send.
    await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeDisabled());
  });

  it("offers a way out of an empty filtered view", async () => {
    // css is on one bookmark and it is not a favourite, so this really is
    // empty. tag=react&favorite=false is not: it matches TanStack Query.
    renderApp(["/bookmarks?tag=css&favorite=true"], { queryClient: testQueryClient() });

    await screen.findByText("Nothing here", {}, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "Clear the filters" }));

    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });
  });
});

describe("favouriting", () => {
  it("moves the star before the server has answered", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: /^Favourite TanStack Query$/ }));

    // The request takes 120ms. This is the guess.
    expect(screen.getByRole("button", { name: /Unfavourite TanStack Query/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Then wait for it to land before the test ends. Without this the PATCH
    // arrives after `afterEach` has reset the mock database, and the *next*
    // test starts from a state nobody wrote. It passes alone and fails in
    // sequence, which is the worst way to find out.
    await waitFor(() => expect(db.find(2)?.favorite).toBe(true), { timeout: 3000 });
  });

  it("ends up agreeing with the server", async () => {
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: /^Favourite TanStack Query$/ }));

    await waitFor(() => expect(db.find(2)?.favorite).toBe(true), { timeout: 3000 });
  });

  it("puts the star back when the write fails", async () => {
    db.failNextWrite(true);
    renderApp(["/bookmarks"], { queryClient: testQueryClient() });
    await screen.findByTestId("bookmarks", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: /^Favourite TanStack Query$/ }));
    expect(screen.getByRole("button", { name: /Unfavourite TanStack Query/ })).toBeInTheDocument();

    // No rollback code beyond one line in onError.
    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: /^Favourite TanStack Query$/ })).toHaveAttribute(
          "aria-pressed",
          "false",
        ),
      { timeout: 3000 },
    );
    expect(db.find(2)?.favorite).toBe(false);
  });
});
