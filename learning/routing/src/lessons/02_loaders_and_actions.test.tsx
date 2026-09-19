import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { resetComments, routes } from "./02_loaders_and_actions";

/**
 * The article titles appear twice on the list page, once in the layout nav and
 * once in the list itself, so an unscoped getByRole("link") finds two and
 * throws. Scoping to the landmark is the fix, and it is a better test anyway:
 * it says which of the two is being clicked.
 */
const nav = () => within(screen.getByRole("navigation", { name: "Articles" }));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}

afterEach(() => {
  resetComments();
});

describe("loaders", () => {
  it("renders the component once, already holding its data", async () => {
    renderAt("/");

    // No spinner inside List, because List is not mounted until the loader has
    // resolved. There is no first render with empty data to guard against.
    const list = await screen.findByTestId("list", {}, { timeout: 2000 });

    expect(list).toHaveTextContent("Render and commit");
  });

  it("gets its params from the URL segment", async () => {
    renderAt("/keys-in-lists");

    expect(await screen.findByTestId("detail", {}, { timeout: 2000 })).toHaveTextContent(
      "Keys in lists",
    );
  });

  it("keeps the old page on screen while the next one loads", async () => {
    renderAt("/");
    await screen.findByTestId("list", {}, { timeout: 2000 });

    await userEvent.click(nav().getByRole("link", { name: "Keys in lists" }));

    // The list is still there and the pending state says why.
    expect(screen.getByTestId("nav-state")).toHaveTextContent("loading");
    expect(screen.getByTestId("list")).toBeInTheDocument();

    await screen.findByTestId("detail", {}, { timeout: 2000 });
    expect(screen.getByTestId("nav-state")).toHaveTextContent("idle");
  });
});

describe("actions", () => {
  it("revalidates the loader without being told what changed", async () => {
    renderAt("/keys-in-lists");
    await screen.findByTestId("detail", {}, { timeout: 2000 });
    expect(screen.getByTestId("comments")).toBeEmptyDOMElement();

    await userEvent.type(screen.getByRole("textbox", { name: "Comment" }), "first");
    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    // The comment appears because the loader re-ran, not because the component
    // put it in state.
    await waitFor(() => expect(screen.getByTestId("comments")).toHaveTextContent("first"), {
      timeout: 2000,
    });
  });

  it("ignores an empty submission", async () => {
    renderAt("/keys-in-lists");
    await screen.findByTestId("detail", {}, { timeout: 2000 });

    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(screen.getByTestId("nav-state")).toHaveTextContent("idle"), {
      timeout: 2000,
    });
    expect(screen.getByTestId("comments")).toBeEmptyDOMElement();
  });
});

describe("errors", () => {
  it("reads the status off a thrown Response", async () => {
    renderAt("/missing");

    const error = await screen.findByRole("alert", {}, { timeout: 2000 });

    // Not "Something went wrong". The boundary could tell it was a 404.
    expect(error).toHaveTextContent("404");
    expect(error).not.toHaveTextContent("Something went wrong");
  });

  it("leaves a way out", async () => {
    renderAt("/missing");
    await screen.findByRole("alert", {}, { timeout: 2000 });

    await userEvent.click(screen.getByRole("link", { name: "Back to the list" }));

    expect(await screen.findByTestId("list", {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
