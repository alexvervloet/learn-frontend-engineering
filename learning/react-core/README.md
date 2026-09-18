# React core 🟢

The largest module, and the one every other module assumes. Eleven lessons on
what React actually does when you call `setState`, why effects have a return
value, and what React 19 added on top.

Every lesson is a component you can click and a test that asserts what the
lesson claims.

## What the files cover

### How React runs

| File                    | What it teaches                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `01_rendering.tsx`      | Render is React calling your function; commit is the DOM change. Batching, and bailing out when nothing changed |
| `02_state_snapshot.tsx` | `count` is baked into one render. Three `setCount(count + 1)` calls add one. The updater form adds three        |
| `03_lists_and_keys.tsx` | An index key hands one row's state to a different row when the list shifts                                      |

### Effects

| File                         | What it teaches                                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| `04_no_effect_needed.tsx`    | State mirrored from a calculation costs a render and a frame of stale UI. Two versions, with counters |
| `05_effects_and_cleanup.tsx` | Connect and disconnect, not mount and unmount. Skip the cleanup and intervals stack up until reload   |

### Escape hatches

| File                           | What it teaches                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `06_refs_and_focus.tsx`        | A ref changes without a render. Focus management, and `ref` as an ordinary prop in React 19            |
| `07_context.tsx`               | Every consumer re-renders when the value changes. Splitting by rate of change, and memoising the value |
| `08_reducer_state_machine.tsx` | A discriminated union makes `loading && error` impossible to spell. The reducer tests with no DOM      |

### Concurrent React

| File                            | What it teaches                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `09_transitions.tsx`            | `useTransition` and `useDeferredValue` over a 20,000 row filter. Interruption, not debouncing             |
| `10_actions_and_optimistic.tsx` | `<form action>`, `useActionState`, `useFormStatus`, and a rollback you did not write                      |
| `11_suspense.tsx`               | `use(promise)`, why the promise must be cached, `lazy()`, and keeping content on screen with a transition |

`useRenderCount.ts` is the measuring instrument the lessons share. It mutates a
ref during render, which is exactly what React asks you not to do, and it has
the lint rule switched off for two lines to say so.

## Run it

```bash
npm install                      # from the repo root, once
npm run dev -w learning/react-core
npm test -- --project react-core
```

Deep-link to a lesson with the hash: `http://localhost:5173/#05-effects-and-cleanup`.

## StrictMode is on

`main.tsx` wraps the app in `<StrictMode>`, so in development React renders every
component twice and mounts, unmounts and remounts every effect. Two consequences
while you are reading:

**Every render count on screen is doubled.** The tests run without StrictMode and
show the real number, so the assertions and the browser disagree by a factor of
two. That is expected.

**Lesson 05's leaky ticker is already leaking before you touch it.** That is what
StrictMode is for: it drags a bug that would otherwise surface in production into
the first render in development.

## Three things that cost real time in the tests

Written up properly in the repo's [LESSONS.md](../../LESSONS.md); the summary:

**Suspense needs two awaited `act` calls.** Testing Library's `render` uses a
synchronous one, and a component that suspends inside it is never retried, so
`findBy` times out against a tree React has decided not to touch.

**Fake timers plus `user-event` deadlock** unless you pass
`{ shouldAdvanceTime: true }`. user-event waits on its own timers between
keystrokes, and a frozen clock never delivers them.

**`findByText` matches the optimistic copy.** Waiting for text that the
optimistic update already put on screen resolves instantly and proves nothing.
Wait for the pending marker to leave instead.

## Not covered here

Portals, `useImperativeHandle`, `useSyncExternalStore` (used by
[lesson-shell](../../packages/lesson-shell/), and covered properly in
state-management), Server Components and `useId`. Data fetching gets its own
module, so lesson 11 shows `use` with a hand-rolled cache rather than pretending
that is what you should ship.
