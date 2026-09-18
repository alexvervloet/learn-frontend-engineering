/**
 * useReducer, and states that cannot happen
 * =========================================
 * The usual way a submit button grows:
 *
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState<string | null>(null);
 *   const [result, setResult] = useState<string | null>(null);
 *
 * Three booleans-ish values is eight combinations, and only four of them mean
 * anything. `loading && error` renders a spinner on top of an error message.
 * `result && error` shows both. Nothing stops you writing the code path that
 * produces them, so eventually someone does, usually in the retry handler.
 *
 * A discriminated union has one field that says which state you are in, and the
 * data for that state lives inside it. There is no way to spell the broken
 * combinations, so no test is needed for them:
 *
 *   | { status: "idle" }
 *   | { status: "submitting"; email: string }
 *   | { status: "success"; message: string }
 *   | { status: "error"; message: string; email: string }
 *
 * `useReducer` is how you move between them. The reducer is a pure function of
 * (state, action), which means the whole flow can be tested without rendering
 * anything, and every transition is in one place instead of scattered across
 * six handlers.
 *
 * When to prefer it over `useState`: more than two or three pieces of related
 * state, or the next value depends on several of the current ones, or you find
 * yourself writing "if we are loading, ignore this".
 *
 * Note that `retry` carries the email forward, and that this is only possible
 * because the error state holds it. A reducer makes that kind of thing obvious.
 */

// the reducer is exported for the tests, alongside the component, so Fast Refresh
// falls back to a full reload for this file. That is the right trade in a
// lesson: a pure function you can test without a DOM is worth more than hot
// reload on a file nobody is iterating on.
/* eslint-disable react-refresh/only-export-components */
import { useReducer } from "react";

export type SubmitState =
  | { status: "idle" }
  | { status: "submitting"; email: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string; email: string };

export type SubmitAction =
  | { type: "submit"; email: string }
  | { type: "resolved"; message: string }
  | { type: "rejected"; message: string }
  | { type: "retry" }
  | { type: "reset" };

export function submitReducer(state: SubmitState, action: SubmitAction): SubmitState {
  switch (action.type) {
    case "submit":
      // A second submit while one is in flight is ignored, not queued. In the
      // three-booleans version this is the bug that double-charges a customer.
      if (state.status === "submitting") return state;
      return { status: "submitting", email: action.email };

    case "resolved":
      if (state.status !== "submitting") return state;
      return { status: "success", message: action.message };

    case "rejected":
      if (state.status !== "submitting") return state;
      return { status: "error", message: action.message, email: state.email };

    case "retry":
      // Only reachable from an error, and the email comes from the state rather
      // than from a field the user may have since edited.
      if (state.status !== "error") return state;
      return { status: "submitting", email: state.email };

    case "reset":
      return { status: "idle" };
  }
}

/** Fails the first time for any given address, then succeeds. */
const seen = new Set<string>();

function subscribe(email: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (seen.has(email)) resolve(`${email} is subscribed`);
      else {
        seen.add(email);
        reject(new Error("the network ate it. try again"));
      }
    }, 400);
  });
}

export function ReducerStateMachine() {
  const [state, dispatch] = useReducer(submitReducer, { status: "idle" });

  async function run(email: string): Promise<void> {
    try {
      dispatch({ type: "resolved", message: await subscribe(email) });
    } catch (error) {
      dispatch({ type: "rejected", message: (error as Error).message });
    }
  }

  return (
    <div className="stack">
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          const email = new FormData(event.currentTarget).get("email");
          if (typeof email !== "string" || email === "") return;
          dispatch({ type: "submit", email });
          void run(email);
        }}
      >
        <input name="email" aria-label="Email" defaultValue="ada@example.com" />
        <button type="submit" disabled={state.status === "submitting"}>
          {state.status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>

      <p data-testid="status">status: {state.status}</p>

      {state.status === "error" && (
        <div className="stack" role="alert">
          <p>{state.message}</p>
          <div className="row">
            <button
              onClick={() => {
                dispatch({ type: "retry" });
                void run(state.email);
              }}
            >
              Retry
            </button>
            <button onClick={() => dispatch({ type: "reset" })}>Start over</button>
          </div>
        </div>
      )}

      {state.status === "success" && <p role="status">{state.message}</p>}

      <p className="note">
        The first submit always fails, so you can see the error state. Retry reuses the address the
        error is holding, not whatever is in the box now.
      </p>
    </div>
  );
}
