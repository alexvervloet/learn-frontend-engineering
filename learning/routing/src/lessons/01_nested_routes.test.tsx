import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { routes } from "./01_nested_routes";

/**
 * A memory router is the whole testing story for React Router. `initialEntries`
 * is the history stack, so a test can start anywhere without touching
 * `window.location` or mocking a thing.
 */
function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}

describe("nesting", () => {
  it("shows the index route at the parent's own path", () => {
    renderAt("/articles");

    expect(screen.getByTestId("index")).toBeInTheDocument();
    expect(screen.queryByTestId("detail")).not.toBeInTheDocument();
  });

  it("keeps the layout mounted while the child changes", async () => {
    renderAt("/articles");
    const nav = screen.getByRole("navigation", { name: "Articles" });

    await userEvent.click(screen.getByRole("link", { name: "Keys in lists" }));

    expect(screen.getByTestId("detail")).toBeInTheDocument();
    // Same DOM node, not a re-created one. This is what a layout route buys.
    expect(screen.getByRole("navigation", { name: "Articles" })).toBe(nav);
  });

  it("resolves a relative link against the route, not the URL", async () => {
    const { router } = renderAt("/articles");

    await userEvent.click(screen.getByRole("link", { name: "Keys in lists" }));

    // `to="keys-in-lists"` from inside /articles. An absolute path here would
    // have produced /keys-in-lists, and a mis-resolved one /articles/articles/…
    expect(router.state.location.pathname).toBe("/articles/keys-in-lists");
  });
});

describe("params", () => {
  it("hands the segment to the child", () => {
    renderAt("/articles/render-and-commit");

    expect(screen.getByTestId("detail")).toHaveTextContent("Render and commit");
  });
});

describe("the splat route", () => {
  it("catches anything unmatched", () => {
    renderAt("/no-such-page");

    expect(screen.getByTestId("not-found")).toBeInTheDocument();
  });

  it("is reachable by clicking, and offers a way back", async () => {
    renderAt("/articles");

    await userEvent.click(screen.getByRole("link", { name: "A broken link" }));
    expect(screen.getByTestId("not-found")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Back to the articles" }));
    expect(screen.getByTestId("index")).toBeInTheDocument();
  });
});

describe("NavLink", () => {
  it("marks the active link for assistive tech, not just visually", async () => {
    renderAt("/articles");

    await userEvent.click(screen.getByRole("link", { name: "Keys in lists" }));

    expect(screen.getByRole("link", { name: "Keys in lists" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Render and commit" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
