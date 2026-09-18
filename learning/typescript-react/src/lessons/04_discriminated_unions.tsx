/**
 * Making the broken combinations unspellable
 * ==========================================
 * The same idea applies to state and to props, and it is the single highest
 * return TypeScript gives you in React code.
 *
 * **State.** Three independent fields is eight combinations for the price of
 * three, and most of them are nonsense. A union with a discriminant has exactly
 * the states you meant, and the data for each one lives inside it, so
 * `state.error` is only reachable when there is an error to read. react-core's
 * reducer lesson builds one; this one is about the typing that makes it work.
 *
 * Two techniques earn their keep:
 *
 *   switch (state.status) { case "ready": … }   narrows `state` in each branch
 *   const _never: never = state;                fails to compile if you add a
 *                                               case and forget to handle it
 *
 * That second line is the whole reason to bother. Adding `{ status: "retrying" }`
 * to the union turns every unhandled `switch` into a compile error naming the
 * file, instead of a silent fallthrough that renders nothing.
 *
 * **Props.** The same shape works on a component that takes one set of props or
 * another. A button that either navigates or runs a handler should not accept
 * both:
 *
 *   type Props =
 *     | { href: string; onClick?: never }
 *     | { onClick: () => void; href?: never };
 *
 * `onClick?: never` is the part that does the work. Without it, TypeScript
 * accepts an object matching one member and quietly ignores extra properties
 * from the other, so `<Action href="/x" onClick={fn} />` compiles and one of
 * them silently does nothing. `?: never` says the property may be absent and
 * may not hold a value, which is exactly "not this variant".
 *
 * The cost is real: the error message for a wrong combination is long and names
 * both members. Use it where the combinations actually matter, not everywhere.
 */

export type Feed =
  | { status: "idle" }
  | { status: "loading"; since: number }
  | { status: "ready"; items: string[] }
  | { status: "failed"; message: string; canRetry: boolean };

/**
 * Exhaustive by construction. Delete a case and this stops compiling, which is
 * the point of the `never` assignment at the bottom.
 */
export function describe(state: Feed): string {
  switch (state.status) {
    case "idle":
      return "nothing requested yet";
    case "loading":
      // `since` exists here and nowhere else.
      return `loading for ${state.since}ms`;
    case "ready":
      return `${state.items.length} items`;
    case "failed":
      return state.canRetry ? `${state.message} (retryable)` : state.message;
    default: {
      // Only reachable if a member was added to Feed and not handled above. At
      // that point `state` is no longer `never` and this line fails to compile.
      const unhandled: never = state;
      return unhandled;
    }
  }
}

type ActionProps =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

export function Action(props: ActionProps) {
  if (props.href !== undefined) {
    return <a href={props.href}>{props.label}</a>;
  }
  return <button onClick={props.onClick}>{props.label}</button>;
}

const STATES: Feed[] = [
  { status: "idle" },
  { status: "loading", since: 1200 },
  { status: "ready", items: ["a", "b", "c"] },
  { status: "failed", message: "the server said no", canRetry: true },
];

export function DiscriminatedUnions() {
  return (
    <div className="stack">
      <h3>One renderer, every state</h3>
      <ul data-testid="states">
        {STATES.map((state) => (
          <li key={state.status}>
            <code>{state.status}</code> · {describe(state)}
          </li>
        ))}
      </ul>

      <h3>Props that cannot be combined</h3>
      <div className="row">
        <Action label="Go somewhere" href="https://react.dev" />
        <Action label="Do something" onClick={() => alert("did it")} />
      </div>

      <p className="note">
        Try adding <code>onClick</code> to the first one in your editor. It is not a lint warning or
        a runtime surprise; it does not compile.
      </p>
    </div>
  );
}
