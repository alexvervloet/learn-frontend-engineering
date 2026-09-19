/**
 * Redux Toolkit
 * =============
 * Redux's reputation for boilerplate is from the pre-RTK era: action type
 * constants, hand-written action creators, a switch statement, spread
 * operators three levels deep. `createSlice` replaced all of it:
 *
 *   const slice = createSlice({
 *     name: "todos",
 *     initialState,
 *     reducers: {
 *       add: (state, action: PayloadAction<string>) => { state.items.push(…) },
 *     },
 *   });
 *
 * That `push` looks like a mutation and is not. RTK runs reducers inside Immer,
 * which hands you a draft, records what you touched, and produces a new
 * immutable object. You write the readable version and get the correct one.
 * The one rule: mutate the draft *or* return a new state, never both in the
 * same reducer.
 *
 * `createSlice` also generates the action creators and their types, so
 * `slice.actions.add("x")` is typed from the reducer's `PayloadAction<string>`.
 *
 * **Typing the hooks once.** `useSelector` and `useDispatch` are generic, and
 * annotating them at every call site is the boilerplate people actually
 * complain about now. Do it once:
 *
 *   export const useAppSelector = useSelector.withTypes<RootState>();
 *   export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
 *
 * **`useSelector` re-renders on reference change**, like any selector. Return a
 * new array or object from one and the component re-renders on every dispatch.
 * `createSelector` from Reselect memoises, and RTK re-exports it.
 *
 * **What Redux still gives you that Zustand does not.** The devtools, properly:
 * every action named, the state before and after, time travel, and a
 * reproducible log you can ask a user to export. A middleware seam for logging,
 * analytics and crash reporting. And an enforced shape, which matters more the
 * more people are writing the code. RTK Query is also in the box, covering the
 * ground TanStack Query covers.
 *
 * The cost is a provider, a configured store, and more concepts than most small
 * applications need. Reach for it when you want the structure, not by default.
 */
import { configureStore, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";

import { useRenderCount } from "../useRenderCount";

export type Todo = { id: string; text: string; done: boolean };
type Filter = "all" | "open" | "done";

const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [] as Todo[], filter: "all" as Filter, nextId: 1 },
  reducers: {
    // Looks like a mutation. Immer makes it produce a new state.
    add: (state, action: PayloadAction<string>) => {
      state.items.push({ id: String(state.nextId), text: action.payload, done: false });
      state.nextId += 1;
    },
    toggle: (state, action: PayloadAction<string>) => {
      const todo = state.items.find((item) => item.id === action.payload);
      // No spread, no map, no rebuilding the array around one change.
      if (todo !== undefined) todo.done = !todo.done;
    },
    setFilter: (state, action: PayloadAction<Filter>) => {
      state.filter = action.payload;
    },
  },
});

export const { add, toggle, setFilter } = todosSlice.actions;

/** A factory, not a singleton: every test gets a store with no history. */
export function makeStore() {
  return configureStore({ reducer: { todos: todosSlice.reducer } });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// Typed once, so no call site needs an annotation.
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Memoised. Without this, `.filter()` returns a new array on every dispatch and
 * the list re-renders even when a completely unrelated field changed.
 */
export const selectVisible = createSelector(
  [(state: RootState) => state.todos.items, (state: RootState) => state.todos.filter],
  (items, filter) => {
    if (filter === "open") return items.filter((item) => !item.done);
    if (filter === "done") return items.filter((item) => item.done);
    return items;
  },
);

function TodoList() {
  const visible = useAppSelector(selectVisible);
  const dispatch = useAppDispatch();
  const renders = useRenderCount();

  return (
    <div>
      <ul data-testid="todos">
        {visible.map((todo) => (
          <li key={todo.id}>
            <label className="row">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => dispatch(toggle(todo.id))}
                aria-label={todo.text}
              />
              <span style={{ textDecoration: todo.done ? "line-through" : undefined }}>
                {todo.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="note">
        <span data-testid="list-renders">{renders}</span> renders
      </p>
    </div>
  );
}

function Counter() {
  // A primitive, so no memoisation needed.
  const total = useAppSelector((state) => state.todos.items.length);
  const renders = useRenderCount();

  return (
    <p>
      {total} total · <span data-testid="counter-renders">{renders}</span> renders
    </p>
  );
}

function AddForm() {
  const dispatch = useAppDispatch();

  return (
    <form
      className="row"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = String(data.get("text") ?? "").trim();
        if (text === "") return;
        dispatch(add(text));
        event.currentTarget.reset();
      }}
    >
      <input name="text" aria-label="New todo" placeholder="something to do" />
      <button type="submit">Add</button>
    </form>
  );
}

function Filters() {
  const filter = useAppSelector((state) => state.todos.filter);
  const dispatch = useAppDispatch();

  return (
    <div className="row">
      {(["all", "open", "done"] as const).map((option) => (
        <button
          key={option}
          onClick={() => dispatch(setFilter(option))}
          aria-pressed={filter === option}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Exported so the test can mount the same tree around its own store. */
export function TodosApp() {
  return (
    <div className="stack">
      <AddForm />
      <Filters />
      <TodoList />
      <Counter />
    </div>
  );
}

export function ReduxToolkit() {
  return (
    <div className="stack">
      <Provider store={makeStore()}>
        <TodosApp />
      </Provider>

      <p className="note">
        The reducers look like they mutate. Immer turns each one into a new state object, which is
        what lets <code>useSelector</code> tell that something changed.
      </p>
    </div>
  );
}
