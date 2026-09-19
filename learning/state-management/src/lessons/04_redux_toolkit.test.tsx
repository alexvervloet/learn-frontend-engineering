import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { TodosApp, add, makeStore, selectVisible, setFilter, toggle } from "./04_redux_toolkit";

function renderApp() {
  const store = makeStore();
  return { store, ...render(<Provider store={store}>{<TodosApp />}</Provider>) };
}

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

describe("Immer in reducers", () => {
  it("produces a new state object despite looking like a mutation", () => {
    const store = makeStore();
    const before = store.getState().todos;

    store.dispatch(add("write the lesson"));

    // `state.items.push(...)` in the reducer. The old object is untouched.
    expect(store.getState().todos).not.toBe(before);
    expect(before.items).toHaveLength(0);
    expect(store.getState().todos.items).toHaveLength(1);
  });

  it("leaves the previous items array intact", () => {
    const store = makeStore();
    store.dispatch(add("one"));
    const firstItems = store.getState().todos.items;

    store.dispatch(add("two"));

    expect(firstItems).toHaveLength(1);
    expect(store.getState().todos.items).toHaveLength(2);
  });

  it("toggles without rebuilding the array by hand", () => {
    const store = makeStore();
    store.dispatch(add("one"));

    store.dispatch(toggle("1"));

    expect(store.getState().todos.items[0]?.done).toBe(true);
  });
});

describe("createSelector", () => {
  it("returns the same array reference when nothing it depends on changed", () => {
    const store = makeStore();
    store.dispatch(add("one"));

    const first = selectVisible(store.getState());
    const second = selectVisible(store.getState());

    // Without memoisation these would be different arrays, and every subscriber
    // would re-render on every dispatch.
    expect(second).toBe(first);
  });

  it("recomputes when the filter changes", () => {
    const store = makeStore();
    store.dispatch(add("one"));
    store.dispatch(toggle("1"));
    store.dispatch(add("two"));

    store.dispatch(setFilter("done"));
    expect(selectVisible(store.getState()).map((todo) => todo.text)).toEqual(["one"]);

    store.dispatch(setFilter("open"));
    expect(selectVisible(store.getState()).map((todo) => todo.text)).toEqual(["two"]);
  });
});

describe("the component tree", () => {
  it("adds and filters", async () => {
    renderApp();

    await userEvent.type(screen.getByRole("textbox", { name: "New todo" }), "write tests");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await userEvent.type(screen.getByRole("textbox", { name: "New todo" }), "ship it");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(within(screen.getByTestId("todos")).getAllByRole("listitem")).toHaveLength(2);

    await userEvent.click(screen.getByRole("checkbox", { name: "write tests" }));
    await userEvent.click(screen.getByRole("button", { name: "done" }));

    expect(within(screen.getByTestId("todos")).getAllByRole("listitem")).toHaveLength(1);
  });

  it("does not re-render the list when only the count subscriber's value changes", async () => {
    renderApp();
    await userEvent.type(screen.getByRole("textbox", { name: "New todo" }), "one");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    const listBefore = renders("list-renders");
    const counterBefore = renders("counter-renders");

    // Re-selecting the same filter dispatches, but nothing either selector
    // reads actually changes.
    await userEvent.click(screen.getByRole("button", { name: "all" }));

    expect(renders("list-renders")).toBe(listBefore);
    expect(renders("counter-renders")).toBe(counterBefore);
  });

  it("gives every test a store with no history", () => {
    const first = renderApp();
    first.store.dispatch(add("leaked?"));

    const second = makeStore();

    // A module-level singleton would have carried the todo across.
    expect(second.getState().todos.items).toHaveLength(0);
  });
});
