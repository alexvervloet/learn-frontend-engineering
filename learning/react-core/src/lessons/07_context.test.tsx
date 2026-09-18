import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Context } from "./07_context";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

async function toggleTheme() {
  await userEvent.click(screen.getByRole("button", { name: /Toggle theme/ }));
}

describe("context and re-renders", () => {
  it("re-renders a consumer that only reads the part which did not change", async () => {
    render(<Context />);
    const before = renders("combined-renders");

    await toggleTheme();

    expect(renders("combined-renders")).toBe(before + 1);
  });

  it("leaves the user consumer alone when the contexts are split", async () => {
    render(<Context />);
    const before = renders("split-renders");

    await toggleTheme();
    await toggleTheme();

    expect(renders("split-renders")).toBe(before);
  });

  it("still re-renders the consumer that does read the changed context", async () => {
    render(<Context />);
    const before = renders("split-theme-renders");

    await toggleTheme();

    expect(renders("split-theme-renders")).toBe(before + 1);
    expect(screen.getByTestId("split-theme-renders").parentElement).toHaveTextContent("dark");
  });
});
