/**
 * Zustand
 * =======
 * The same store as lesson 02, with the sharp edges filed off. One function,
 * no provider, no context:
 *
 *   const useCart = create<Cart>()((set, get) => ({
 *     items: [],
 *     add: (item) => set((s) => ({ items: [...s.items, item] })),
 *   }));
 *
 * Then `useCart((s) => s.items)` anywhere in the tree. The absence of a
 * provider is not just less typing: the store is a module, so a non-React
 * module can read or write it with `useCart.getState()` and
 * `useCart.setState()`. Handy for a WebSocket handler or a route loader, and
 * worth being careful with, because a mutation from outside React is
 * untraceable in a component stack.
 *
 * **Put the actions in the store.** Components then import one hook rather than
 * a hook and a pile of setters, and the update logic sits next to the state it
 * changes. `set` merges at the top level, unlike React's `useState`, so
 * `set({ count: 1 })` leaves the other keys alone.
 *
 * **`useShallow` is for selectors that build an object.** As in lesson 02, a
 * selector returning `{ a, b }` makes a new reference every time and re-renders
 * on every store change:
 *
 *   const { a, b } = useCart(useShallow((s) => ({ a: s.a, b: s.b })));
 *
 * It compares one level deep, so the object is "equal" when its values are.
 * Two separate selectors are usually simpler and are what the demo does;
 * `useShallow` earns its place when the derived value genuinely is an object.
 *
 * **`persist` is a middleware, and it is asynchronous by default.** Wrapping a
 * store in `persist` writes to `localStorage` on every change and rehydrates on
 * load. Two things to know: the first render happens *before* rehydration
 * finishes, so a component can briefly show the initial state, and
 * `partialize` is how you keep transient fields out of storage. Persisting a
 * whole store including `isLoading: true` is a good way to ship a permanently
 * stuck spinner.
 *
 * **Where it fits.** Zustand is the low-ceremony option: no provider, no
 * reducers, minimal types. It gives up Redux's enforced structure and its
 * time-travel devtools, which is a fair trade for most applications and not for
 * all of them.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";

import { useRenderCount } from "../useRenderCount";

export type CartItem = { id: string; title: string; price: number };

type CartState = {
  items: CartItem[];
  discountCode: string;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setDiscount: (code: string) => void;
  clear: () => void;
};

const INITIAL = { items: [] as CartItem[], discountCode: "" };

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      ...INITIAL,

      // Actions live with the state they change.
      add: (item) => set((state) => ({ items: [...state.items, item] })),
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      // `set` merges at the top level, so `items` is untouched here.
      setDiscount: (code) => set({ discountCode: code }),
      clear: () => set(INITIAL),
    }),
    {
      name: "state-management:cart",
      // Only the parts worth keeping. Persisting everything is how a transient
      // flag ends up stuck across reloads.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Derived, in the component. A selector that computed this would run on every store change. */
export function subtotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price, 0);
}

function ItemCount() {
  const count = useCart((state) => state.items.length);
  const renders = useRenderCount();

  return (
    <p>
      {count} items · <span data-testid="count-renders">{renders}</span> renders
    </p>
  );
}

function Discount() {
  const discountCode = useCart((state) => state.discountCode);
  const setDiscount = useCart((state) => state.setDiscount);
  const renders = useRenderCount();

  return (
    <label className="row">
      Discount
      <input
        aria-label="Discount"
        value={discountCode}
        onChange={(event) => setDiscount(event.target.value)}
      />
      <span className="note">
        <span data-testid="discount-renders">{renders}</span> renders
      </span>
    </label>
  );
}

function Summary() {
  // One selector building an object, so it needs shallow comparison. Two
  // separate selectors would need none, which is usually the better answer.
  const { items, discountCode } = useCart(
    useShallow((state) => ({ items: state.items, discountCode: state.discountCode })),
  );
  const renders = useRenderCount();

  return (
    <div>
      <p data-testid="subtotal">
        subtotal {subtotal(items)}
        {discountCode === "" ? "" : ` (code ${discountCode})`}
      </p>
      <p className="note">
        <span data-testid="summary-renders">{renders}</span> renders
      </p>
    </div>
  );
}

const CATALOGUE: CartItem[] = [
  { id: "1", title: "Keyboard", price: 80 },
  { id: "2", title: "Mouse", price: 40 },
];

export function Zustand() {
  const items = useCart((state) => state.items);
  const add = useCart((state) => state.add);
  const remove = useCart((state) => state.remove);
  const clear = useCart((state) => state.clear);

  return (
    <div className="stack">
      <div className="row">
        {CATALOGUE.map((item) => (
          <button key={item.id} onClick={() => add(item)}>
            Add {item.title}
          </button>
        ))}
        <button onClick={clear} disabled={items.length === 0}>
          Clear
        </button>
      </div>

      <ul data-testid="items">
        {items.map((item, index) => (
          <li key={`${item.id}-${index}`} className="row">
            {item.title} · {item.price}
            <button onClick={() => remove(item.id)} aria-label={`Remove ${item.title}`}>
              ×
            </button>
          </li>
        ))}
      </ul>

      <ItemCount />
      <Discount />
      <Summary />

      <p className="note">
        Type in the discount box: the item counter does not move. Reload the page: the items come
        back and the discount code does not, because <code>partialize</code> only kept the items.
      </p>
    </div>
  );
}
