import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { nextParams, routes } from "./03_search_params";

function renderAt(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}

const search = (router: { state: { location: { search: string } } }) =>
  router.state.location.search;

/**
 * `router.navigate` is called outside React, so the state update it triggers
 * needs an act wrapper or the assertions run against the previous render.
 */
async function goBack(router: { navigate: (delta: number) => Promise<void> | void }) {
  await act(async () => {
    await router.navigate(-1);
  });
}

describe("which params get written", () => {
  it("leaves a default out entirely rather than spelling it", () => {
    expect(nextParams(new URLSearchParams(), { sort: "newest" }).toString()).toBe("");
    expect(nextParams(new URLSearchParams(), { sort: "oldest" }).toString()).toBe("sort=oldest");
  });

  it("treats page 1 as absent", () => {
    expect(nextParams(new URLSearchParams(), { page: 1 }).toString()).toBe("");
    expect(nextParams(new URLSearchParams("page=3"), { page: 1 }).toString()).toBe("");
    expect(nextParams(new URLSearchParams(), { page: 2 }).toString()).toBe("page=2");
  });

  it("clears the page when the filter changes", () => {
    // Otherwise you land on page 3 of a two-page result and see nothing.
    const result = nextParams(new URLSearchParams("page=3&tag=css"), { tag: "react" });

    expect(result.get("page")).toBeNull();
    expect(result.get("tag")).toBe("react");
  });

  it("keeps params it was not asked about", () => {
    const result = nextParams(new URLSearchParams("q=keys&sort=oldest"), { tag: "css" });

    expect(result.get("q")).toBe("keys");
    expect(result.get("sort")).toBe("oldest");
  });
});

describe("reading from the URL", () => {
  it("renders the state the URL describes, with no initialisation step", async () => {
    renderAt("/?tag=css&page=2");

    expect(screen.getByRole("button", { name: "css" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("page")).toHaveTextContent("page 2");
  });

  it("follows the Back button, because nothing was copied into state", async () => {
    const { router } = renderAt("/");

    await userEvent.click(screen.getByRole("button", { name: "css" }));
    expect(search(router)).toBe("?tag=css");
    expect(screen.getByRole("button", { name: "css" })).toHaveAttribute("aria-pressed", "true");

    await goBack(router);

    // A useState copy would still be showing "css" here.
    expect(search(router)).toBe("");
    expect(screen.getByRole("button", { name: "all" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("push versus replace", () => {
  it("adds one history entry per filter click", async () => {
    const { router } = renderAt("/");

    await userEvent.click(screen.getByRole("button", { name: "css" }));
    await userEvent.click(screen.getByRole("button", { name: "react" }));
    await goBack(router);

    expect(search(router)).toBe("?tag=css");
  });

  it("adds none while typing in the search box", async () => {
    const { router } = renderAt("/");

    // One push, so there is somewhere to go back to.
    await userEvent.click(screen.getByRole("button", { name: "css" }));
    await userEvent.type(screen.getByRole("textbox", { name: "search" }), "keys");
    expect(search(router)).toBe("?tag=css&q=keys");

    await goBack(router);

    // Four keystrokes, zero new entries: Back skips the whole query and lands
    // where it was before the filter. With push semantics it would have taken
    // five presses to get here.
    expect(search(router)).toBe("");
  });
});
