/**
 * Jotai
 * =====
 * Zustand and Redux are top-down: one store object, and components select
 * slices out of it. Jotai is bottom-up: many tiny independent atoms, and a
 * component subscribes to the specific atoms it uses.
 *
 *   const countAtom = atom(0);
 *   const [count, setCount] = useAtom(countAtom);
 *
 * There is no store to define and no selector to write, because the atom *is*
 * the unit of subscription. A component reading `countAtom` re-renders when
 * that atom changes and at no other time. The `useState`-shaped API is not a
 * coincidence: moving a `useState` up to a module is usually a one-line change.
 *
 * **Derived atoms are the real feature.** An atom can be computed from others:
 *
 *   const totalAtom = atom((get) => get(itemsAtom).reduce(…));
 *
 * Jotai tracks which atoms the function read and recomputes only when one of
 * them changes. That is a dependency graph you did not have to declare, and it
 * is why Jotai suits derived state that would otherwise be a pile of
 * `createSelector` calls. A read-only derived atom cannot be set, which the
 * types enforce.
 *
 * **Write-only atoms** are the action equivalent: `atom(null, (get, set, arg) => …)`.
 * Useful for an operation touching several atoms at once.
 *
 * **Pick the three apart by what your state looks like.**
 *
 *   Jotai      lots of small independent pieces, heavy derivation, or state
 *              that wants to be scoped to a subtree with a Provider
 *   Zustand    one coherent domain object with actions on it
 *   Redux      you want the devtools, the middleware seam and the enforced
 *              shape, usually because several people are writing the code
 *
 * None of them is for server data. That goes in a query cache.
 *
 * **The cost is that state is scattered.** With no single store object, "what
 * is in state right now" is not a question with one answer, and the devtools
 * story is weaker. Atoms defined in module scope are also shared globally,
 * which is a problem in tests and in SSR. `<Provider>` scopes them, and
 * `useHydrateAtoms` seeds them per request.
 */
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";

import { useRenderCount } from "../useRenderCount";

export type Line = { id: string; label: string; quantity: number; price: number };

export const linesAtom = atom<Line[]>([
  { id: "1", label: "Keyboard", quantity: 1, price: 80 },
  { id: "2", label: "Mouse", quantity: 2, price: 40 },
]);

export const taxRateAtom = atom(0.2);
export const noteAtom = atom("");

/** Derived. Jotai works out that it depends on linesAtom, and nothing else. */
export const subtotalAtom = atom((get) =>
  get(linesAtom).reduce((total, line) => total + line.quantity * line.price, 0),
);

/** Derived from a derived atom. The graph is inferred, not declared. */
export const totalAtom = atom((get) => Math.round(get(subtotalAtom) * (1 + get(taxRateAtom))));

/** Write-only: an action that touches one atom, exposed as a setter. */
export const setQuantityAtom = atom(
  null,
  (get, set, { id, quantity }: { id: string; quantity: number }) => {
    set(
      linesAtom,
      get(linesAtom).map((line) =>
        line.id === id ? { ...line, quantity: Math.max(0, quantity) } : line,
      ),
    );
  },
);

function Subtotal() {
  const subtotal = useAtomValue(subtotalAtom);
  const renders = useRenderCount();

  return (
    <p>
      subtotal {subtotal} · <span data-testid="subtotal-renders">{renders}</span> renders
    </p>
  );
}

function Total() {
  const total = useAtomValue(totalAtom);
  const renders = useRenderCount();

  return (
    <p>
      total {total} · <span data-testid="total-renders">{renders}</span> renders
    </p>
  );
}

function Note() {
  // Reads an atom nothing else depends on.
  const [note, setNote] = useAtom(noteAtom);
  const renders = useRenderCount();

  return (
    <label className="row">
      Note
      <input aria-label="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      <span className="note">
        <span data-testid="note-renders">{renders}</span> renders
      </span>
    </label>
  );
}

function Lines() {
  const lines = useAtomValue(linesAtom);
  const setQuantity = useSetAtom(setQuantityAtom);

  return (
    <ul data-testid="lines">
      {lines.map((line) => (
        <li key={line.id} className="row">
          {line.label}
          <input
            type="number"
            min={0}
            value={line.quantity}
            aria-label={`${line.label} quantity`}
            onChange={(event) => setQuantity({ id: line.id, quantity: Number(event.target.value) })}
            style={{ width: "4rem" }}
          />
          × {line.price}
        </li>
      ))}
    </ul>
  );
}

function TaxRate() {
  const [rate, setRate] = useAtom(taxRateAtom);

  return (
    <label className="row">
      Tax
      <select
        aria-label="Tax"
        value={String(rate)}
        onChange={(event) => setRate(Number(event.target.value))}
      >
        <option value="0">0%</option>
        <option value="0.2">20%</option>
      </select>
    </label>
  );
}

export function JotaiLesson() {
  return (
    <div className="stack">
      <Lines />
      <TaxRate />
      <Subtotal />
      <Total />
      <Note />

      <p className="note">
        Change a quantity: subtotal and total both recompute. Change the tax: only the total does,
        because the subtotal does not depend on it. Type in the note and neither moves. Nobody wrote
        a dependency list.
      </p>
    </div>
  );
}
