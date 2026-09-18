import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContextAndHooks, ThemeProvider, useTheme, useToggle } from "./06_context_and_hooks";

describe("useTheme", () => {
  it("fails with the name of the hook when the provider is missing", () => {
    // React logs the error it is about to rethrow. Silencing it keeps the test
    // output readable without hiding a real failure: the assertion below is
    // what decides whether this passes.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(() => renderHook(() => useTheme())).toThrow(
        "useTheme must be used inside <ThemeProvider>",
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("returns the value the provider supplied", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.name).toBe("light");

    act(() => result.current.toggle());
    expect(result.current.name).toBe("dark");
  });
});

describe("useToggle", () => {
  it("returns a value and a stable toggler", () => {
    const { result, rerender } = renderHook(() => useToggle());
    const [initial, toggle] = result.current;

    expect(initial).toBe(false);

    act(() => toggle());
    expect(result.current[0]).toBe(true);

    // useCallback with an empty dependency list, so the function identity holds
    // across renders and a memo'd child is not re-rendered by it.
    rerender();
    expect(result.current[1]).toBe(toggle);
  });

  it("takes an initial value", () => {
    const { result } = renderHook(() => useToggle(true));

    expect(result.current[0]).toBe(true);
  });
});

describe("the lesson", () => {
  it("toggles both pieces of state independently", async () => {
    render(<ContextAndHooks />);

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.queryByTestId("details")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    await userEvent.click(screen.getByRole("button", { name: "Show details" }));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("details")).toBeInTheDocument();
  });
});
