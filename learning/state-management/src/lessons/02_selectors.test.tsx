import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { createStore, useStore } from "../store";
import { Selectors, actions } from "./02_selectors";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

afterEach(() => {
  actions.reset();
});

describe("the store itself", () => {
  it("notifies subscribers on a change", () => {
    const store = createStore({ n: 0 });
    let calls = 0;
    const unsubscribe = store.subscribe(() => (calls += 1));

    store.setState((s) => ({ n: s.n + 1 }));
    expect(calls).toBe(1);

    unsubscribe();
    store.setState((s) => ({ n: s.n + 1 }));
    expect(calls).toBe(1);
  });

  it("bails out when the updater returns the same object", () => {
    const store = createStore({ n: 0 });
    let calls = 0;
    store.subscribe(() => (calls += 1));

    // Same reference back. React does the same thing for setState.
    store.setState((s) => s);

    expect(calls).toBe(0);
  });

  it("replaces rather than mutates, so the snapshot really changes", () => {
    const store = createStore({ n: 0 });
    const before = store.getState();

    store.setState((s) => ({ ...s, n: 1 }));

    // Mutating in place would leave these Object.is-equal and React would skip
    // the render entirely.
    expect(store.getState()).not.toBe(before);
    expect(before.n).toBe(0);
  });
});

describe("selecting a slice", () => {
  it("re-renders only the panel whose slice changed", async () => {
    render(<Selectors />);
    const before = {
      count: renders("count-renders"),
      name: renders("name-renders"),
      bystander: renders("bystander-renders"),
    };

    await userEvent.click(screen.getByRole("button", { name: "Increment the count" }));

    expect(renders("count-renders")).toBe(before.count + 1);
    // The whole point. With context, both of these would have gone up.
    expect(renders("name-renders")).toBe(before.name);
    expect(renders("bystander-renders")).toBe(before.bystander);
  });

  it("works the other way round too", async () => {
    render(<Selectors />);
    const before = renders("count-renders");

    await userEvent.click(screen.getByRole("button", { name: "Change the name" }));

    expect(renders("count-renders")).toBe(before);
    expect(renders("name-renders")).toBeGreaterThan(1);
  });

  it("re-renders nothing when the selected value is set to what it already was", () => {
    render(<Selectors />);
    const before = renders("name-renders");

    act(() => actions.rename("Ada"));

    expect(renders("name-renders")).toBe(before);
  });
});

describe("a selector that returns a new object", () => {
  it("is never equal to the last one, which is the bug", () => {
    const store = createStore({ name: "Ada", count: 0 });
    const selector = (state: { name: string }) => ({ name: state.name });

    // Nothing changed, and the two snapshots still differ.
    expect(selector(store.getState())).not.toBe(selector(store.getState()));
    expect(selector(store.getState())).toEqual(selector(store.getState()));
  });

  it("is why one selector per value is the default advice", () => {
    const store = createStore({ name: "Ada", count: 0 });
    const selectName = (state: { name: string }) => state.name;

    expect(selectName(store.getState())).toBe(selectName(store.getState()));
    expect(useStore).toBeTypeOf("function");
  });
});
