# State management 🟢

Five lessons. The first two are about the decision; the last three are the
libraries, compared on the same kind of problem.

## What the files cover

| File                       | What it teaches                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `01_where_state_lives.tsx` | Local → lifted → the URL → a query cache → a store, in that order. What lifting costs, measured   |
| `02_selectors.tsx`         | The one thing a store does that context cannot, built from `useSyncExternalStore` in thirty lines |
| `03_zustand.tsx`           | No provider, actions in the store, `useShallow`, and `persist` with `partialize`                  |
| `04_redux_toolkit.tsx`     | `createSlice`, Immer drafts that look like mutations, typed hooks once, `createSelector`          |
| `05_jotai.tsx`             | Atoms instead of a store, derived atoms with a dependency graph nobody declared                   |

`src/store.ts` is the hand-rolled store the second lesson builds. Read it before
the library lessons and they stop being magic.

## Run it

```bash
npm install                              # from the repo root, once
npm run dev -w learning/state-management
npm test -- --project state-management
```

## The short version

**Server data is not client state.** The single biggest mistake is copying API
responses into a store: you then own caching, invalidation, staleness, retries,
deduplication and refetch-on-focus, and you will reimplement all of them badly.
That belongs in a query cache. See [data-fetching](../data-fetching/). A large
fraction of what is in a typical Redux store is a cached GET.

**Then pick by shape.**

|               | Reach for it when                                                                |
| ------------- | -------------------------------------------------------------------------------- |
| Zustand       | One coherent domain object with actions on it, and you want no ceremony          |
| Redux Toolkit | You want the devtools, a middleware seam, and a shape the team has to follow     |
| Jotai         | Lots of small independent pieces, heavy derivation, or state scoped to a subtree |

## How the tests measure the thing

Every claim in this module is about _which components re-render_, which is
invisible without counting. `src/useRenderCount.ts` mutates a ref during render
to count, which is exactly what React asks you not to do; it is a measuring
instrument and the lint rule is off for two lines to say so. Under StrictMode
the browser numbers are doubled; the tests run without it and see the real
count.

The assertions that matter look like this:

```ts
await userEvent.type(screen.getByRole("textbox", { name: "Discount" }), "HALF");

expect(renders("count-renders")).toBe(before); // four keystrokes, zero renders
expect(renders("discount-renders")).toBeGreaterThan(before);
```

## Three things that bit while writing this

**A module-level store outlives the test that used it.** Zustand's store and
Jotai's default store are both module globals. Tests passed alone and failed in
a different order until the Zustand store got an explicit reset in `beforeEach`
and the Jotai tests got a `<Provider>` with their own store. That `<Provider>`
is not a test trick: it is the same thing you need for SSR, where a shared
module store leaks one request's state into the next.

**A test can pass for the wrong reason.** The Jotai clamp test typed `-5` into
a `type="number"` field and asserted the result was not negative. It passed,
because the input silently drops the minus sign, and the clamp never ran. It
now drives the atom directly and asserts `0`.

**`Number(el.textContent)` is `NaN` if the element holds anything else.** A
render counter written as `<span data-testid="x">{n} renders</span>` reads as
`NaN`, and `expect(NaN).toBeGreaterThan(1)` fails with a message about numbers
that tells you nothing about the markup.

## Not covered here

Redux middleware and RTK Query, Zustand's `subscribeWithSelector` and slices
pattern, Jotai's `atomFamily` and `useHydrateAtoms`, XState for genuine state
machines, and the SSR hydration story for all three. The last belongs with the
rendering-strategies module.
