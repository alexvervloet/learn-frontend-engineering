import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { routes } from "./04_lazy_routes";

function renderAt(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { ...render(<RouterProvider router={router} />), router };
}

describe("lazy routes", () => {
  it("does not render the split route until it is navigated to", () => {
    renderAt("/");

    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.queryByTestId("settings")).not.toBeInTheDocument();
  });

  it("loads the chunk and runs its loader as one navigation", async () => {
    renderAt("/");

    await userEvent.click(screen.getByRole("link", { name: "Settings (lazy)" }));

    // The old page is still up while the chunk downloads and the loader runs.
    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.getByTestId("nav-state")).toHaveTextContent("loading");

    const settings = await screen.findByTestId("settings", {}, { timeout: 2000 });

    // Both arrived together: the component rendered already holding its
    // loader's data. With React.lazy the fetch would only start here.
    expect(settings).toHaveTextContent(/Loaded at \d/);
  });

  it("can be entered directly by URL", async () => {
    renderAt("/settings");

    expect(await screen.findByTestId("settings", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("keeps the layout mounted across the lazy boundary", async () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Sections" });

    await userEvent.click(screen.getByRole("link", { name: "Settings (lazy)" }));
    await screen.findByTestId("settings", {}, { timeout: 2000 });

    expect(screen.getByRole("navigation", { name: "Sections" })).toBe(nav);
  });
});
