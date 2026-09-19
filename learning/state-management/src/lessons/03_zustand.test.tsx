import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Zustand, subtotal, useCart } from "./03_zustand";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

beforeEach(() => {
  // A module-level store outlives the test that touched it, so reset it
  // explicitly. Without this, tests pass alone and fail in a different order.
  useCart.setState({ items: [], discountCode: "" });
  localStorage.clear();
});

afterEach(() => {
  useCart.setState({ items: [], discountCode: "" });
});

describe("the store outside React", () => {
  it("can be read and written with no component mounted", () => {
    useCart.getState().add({ id: "1", title: "Keyboard", price: 80 });

    expect(useCart.getState().items).toHaveLength(1);
  });

  it("merges at the top level rather than replacing", () => {
    useCart.getState().add({ id: "1", title: "Keyboard", price: 80 });
    useCart.getState().setDiscount("HALF");

    // `set({ discountCode })` left `items` alone. useState would have replaced
    // the whole object.
    expect(useCart.getState().items).toHaveLength(1);
    expect(useCart.getState().discountCode).toBe("HALF");
  });
});

describe("selectors", () => {
  it("leaves a component alone when the slice it reads did not change", async () => {
    render(<Zustand />);
    const before = renders("count-renders");

    await userEvent.type(screen.getByRole("textbox", { name: "Discount" }), "HALF");

    // Four keystrokes, zero re-renders of the item counter.
    expect(renders("count-renders")).toBe(before);
    expect(renders("discount-renders")).toBeGreaterThan(before);
  });

  it("re-renders the subscriber when its own slice changes", async () => {
    render(<Zustand />);
    const before = renders("count-renders");

    await userEvent.click(screen.getByRole("button", { name: "Add Keyboard" }));

    expect(renders("count-renders")).toBe(before + 1);
    expect(screen.getByTestId("items")).toHaveTextContent("Keyboard");
  });
});

describe("useShallow", () => {
  it("still updates when a value inside the selected object changes", async () => {
    render(<Zustand />);

    await userEvent.click(screen.getByRole("button", { name: "Add Keyboard" }));
    await userEvent.click(screen.getByRole("button", { name: "Add Mouse" }));

    expect(screen.getByTestId("subtotal")).toHaveTextContent("subtotal 120");
  });

  it("keeps the summary in step with the discount too", async () => {
    render(<Zustand />);

    await userEvent.type(screen.getByRole("textbox", { name: "Discount" }), "HALF");

    expect(screen.getByTestId("subtotal")).toHaveTextContent("code HALF");
  });
});

describe("persist", () => {
  it("writes the partialized slice and nothing else", async () => {
    render(<Zustand />);

    await userEvent.click(screen.getByRole("button", { name: "Add Keyboard" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Discount" }), "HALF");

    const stored = JSON.parse(localStorage.getItem("state-management:cart") ?? "{}") as {
      state?: Record<string, unknown>;
    };

    expect(stored.state).toHaveProperty("items");
    // partialize kept it out. Persisting a transient field is how a stuck
    // spinner survives a reload.
    expect(stored.state).not.toHaveProperty("discountCode");
  });
});

describe("derived values", () => {
  it("are computed in the component, not in a selector", () => {
    // A selector doing this would re-run on every unrelated store change.
    expect(subtotal([])).toBe(0);
    expect(subtotal([{ id: "1", title: "a", price: 80 }])).toBe(80);
  });
});
