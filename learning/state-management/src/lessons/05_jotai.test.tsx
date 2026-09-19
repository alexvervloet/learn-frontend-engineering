import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider, createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  JotaiLesson,
  linesAtom,
  setQuantityAtom,
  subtotalAtom,
  taxRateAtom,
  totalAtom,
} from "./05_jotai";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

/**
 * Atoms declared in module scope live in Jotai's default store, which is shared
 * by every test in the file. Rendering the lesson bare would let one test's
 * quantity change decide what the next test starts from, and the failure only
 * shows up when the order changes.
 *
 * `<Provider>` scopes the atoms to a store this test owns. It is the same
 * mechanism you need for SSR, where one module-level store shared across
 * requests would leak one user's state to the next.
 */
function renderIsolated() {
  const store = createStore();
  return { store, ...render(<Provider store={store}>{<JotaiLesson />}</Provider>) };
}

describe("derived atoms", () => {
  it("computes from its dependencies with no wiring", () => {
    const store = createStore();

    // 1 × 80 + 2 × 40
    expect(store.get(subtotalAtom)).toBe(160);
    expect(store.get(totalAtom)).toBe(192);
  });

  it("recomputes when a dependency changes", () => {
    const store = createStore();

    store.set(linesAtom, [{ id: "1", label: "Keyboard", quantity: 3, price: 80 }]);

    expect(store.get(subtotalAtom)).toBe(240);
    expect(store.get(totalAtom)).toBe(288);
  });

  it("chains through a derived atom that depends on another", () => {
    const store = createStore();

    store.set(taxRateAtom, 0);

    // total depends on subtotal, which did not change.
    expect(store.get(subtotalAtom)).toBe(160);
    expect(store.get(totalAtom)).toBe(160);
  });
});

describe("who re-renders", () => {
  it("wakes both derived readers when the source changes", async () => {
    renderIsolated();
    const before = { subtotal: renders("subtotal-renders"), total: renders("total-renders") };

    await userEvent.clear(screen.getByRole("spinbutton", { name: "Keyboard quantity" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Keyboard quantity" }), "3");

    expect(renders("subtotal-renders")).toBeGreaterThan(before.subtotal);
    expect(renders("total-renders")).toBeGreaterThan(before.total);
  });

  it("wakes only the reader that actually depends on what changed", async () => {
    renderIsolated();
    const before = { subtotal: renders("subtotal-renders"), total: renders("total-renders") };

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Tax" }), "0");

    // subtotal does not read taxRateAtom, so Jotai does not wake it.
    expect(renders("subtotal-renders")).toBe(before.subtotal);
    expect(renders("total-renders")).toBe(before.total + 1);
  });

  it("leaves everything alone when an unrelated atom changes", async () => {
    renderIsolated();
    const before = { subtotal: renders("subtotal-renders"), total: renders("total-renders") };

    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "hello");

    expect(renders("subtotal-renders")).toBe(before.subtotal);
    expect(renders("total-renders")).toBe(before.total);
    expect(renders("note-renders")).toBeGreaterThan(1);
  });
});

describe("write-only atoms", () => {
  it("clamps in the atom, so no caller can bypass it", () => {
    // Driven through the store rather than the input. A `type="number"` field
    // silently drops the minus sign, so typing "-5" into it proves nothing
    // about the clamp: the first version of this test passed with the value 5
    // and the clamp never running.
    const store = createStore();

    store.set(setQuantityAtom, { id: "2", quantity: -5 });

    expect(store.get(linesAtom).find((line) => line.id === "2")?.quantity).toBe(0);
  });

  it("updates only the line it was given", () => {
    const store = createStore();

    store.set(setQuantityAtom, { id: "1", quantity: 7 });

    expect(store.get(linesAtom).map((line) => line.quantity)).toEqual([7, 2]);
    expect(store.get(subtotalAtom)).toBe(7 * 80 + 2 * 40);
  });

  it("is wired to the input in the UI", async () => {
    renderIsolated();

    await userEvent.clear(screen.getByRole("spinbutton", { name: "Mouse quantity" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Mouse quantity" }), "4");

    expect(screen.getByRole("spinbutton", { name: "Mouse quantity" })).toHaveValue(4);
  });
});
