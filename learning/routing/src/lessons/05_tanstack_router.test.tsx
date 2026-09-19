import { RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { makeRouter } from "./05_tanstack_router";

async function renderAt(path = "/") {
  const router = makeRouter([path]);
  const result = render(<RouterProvider router={router} />);
  // The router resolves its first match asynchronously.
  await screen.findByRole("navigation", { name: "Articles" }, { timeout: 2000 });
  return { ...result, router };
}

describe("validated search params", () => {
  it("parses strings into the types the component expects", async () => {
    await renderAt("/?page=3&sort=oldest");

    expect(await screen.findByTestId("search")).toHaveTextContent("page 3, sorted oldest");
  });

  it("repairs nonsense rather than propagating it", async () => {
    // A hand-edited URL, a stale bookmark, a bad link in an email.
    await renderAt("/?page=banana&sort=sideways");

    expect(await screen.findByTestId("search")).toHaveTextContent("page 1, sorted newest");
  });

  it("clamps out-of-range values in one place", async () => {
    await renderAt("/?page=-4");

    expect(await screen.findByTestId("search")).toHaveTextContent("page 1");
  });

  it("builds the next link from the parsed values", async () => {
    await renderAt("/?page=2&sort=oldest");
    await screen.findByTestId("search");

    await userEvent.click(screen.getByTestId("next"));

    expect(
      await screen.findByText(/page 3, sorted oldest/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});

describe("typed params", () => {
  it("matches a param route and hands over the segment", async () => {
    await renderAt("/article/keys-in-lists");

    const detail = await screen.findByTestId("detail", {}, { timeout: 2000 });
    expect(detail).toHaveTextContent("Keys in lists");
  });

  it("navigates by route id and params rather than a built string", async () => {
    await renderAt("/");

    await userEvent.click(screen.getByRole("link", { name: "Render and commit" }));

    expect(await screen.findByTestId("detail", {}, { timeout: 2000 })).toHaveTextContent(
      "Render and commit",
    );
  });
});
