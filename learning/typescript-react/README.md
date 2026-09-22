# TypeScript with React 🟢

Seven lessons on the types you actually write in a React codebase, and the one
place the type system stops protecting you.

This is the only module in the repo that asserts types as well as behaviour.
Alongside the usual `.test.tsx` files there are `.test-d.tsx` files full of
`expectTypeOf` and `@ts-expect-error`, and Vitest runs `tsc` over them as part of
`npm test`. A type that quietly widens fails the suite with a line number.

## What the files cover

### The everyday types

| File                        | What it teaches                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_props_and_children.tsx` | `children` is `ReactNode`, not `JSX.Element`. Extending `ComponentProps<"button">` rather than retyping a button. Which way to spread `...rest` |
| `02_events.tsx`             | `currentTarget` is typed and `target` is not. Why inline handlers need no annotation. `FormData.get` returning `string \| File \| null`         |
| `03_refs.tsx`               | The initial value decides the type. `ref` as a plain prop in React 19, ref callbacks that return a cleanup, and refs not causing renders        |

### Designing with types

| File                          | What it teaches                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `04_discriminated_unions.tsx` | Exhaustive `switch` with a `never` guard, and `?: never` for props that must not combine                                            |
| `05_generic_components.tsx`   | A generic component is a generic function. `getKey` over a `T extends { id }` constraint. What a polymorphic `as` prop really costs |
| `06_context_and_hooks.tsx`    | A hook that throws turns `T \| null` into `T` for every consumer. Tuples need `as const` or an explicit return type                 |

### The boundary

| File                      | What it teaches                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `07_as_and_satisfies.tsx` | `as` is you overruling the compiler. `satisfies` keeps the key set. `unknown` over `any`. One Zod schema giving both the check and the type |

`src/type-assertions.ts` holds `Equals<A, B>`, used by the type tests.

## Run it

```bash
npm install                            # from the repo root, once
npm run dev -w learning/typescript-react   # http://localhost:5172
npm test -- --project typescript-react
```

## How the type tests work

`vitest.config.ts` turns on `typecheck` for `**/*.test-d.tsx`. Two tools inside:

```tsx
// Fails the suite if this line stops being an error.
// @ts-expect-error "loud" is not one of the three variants
assertType(<Button variant="loud" />);

// Fails the suite if the return type widens.
expectTypeOf<ReturnType<typeof useToggle>>().toEqualTypeOf<readonly [boolean, () => void]>();
```

`@ts-expect-error` is the more valuable of the two. It is the only way to assert
that something is still _rejected_, and rejection is most of what a good props
type does.

Prove the setup is live by deleting a `@ts-expect-error` and running the suite.
You get a real failure with a file and line, not a silent pass.

## Two things that cost time here

**`expectTypeOf(...).toEqualTypeOf<HTMLFormElement>()` does not work.**
It compares structurally, and DOM interfaces are huge and mutually recursive, so
TypeScript bails out with a hundred-line constraint error about `NamedNodeMap`
and `ownerDocument` that says nothing about your assertion. `Equals<A, B>` in
`src/type-assertions.ts` compares two conditional types instead, which never
expands either side.

**React types these as `EventTarget & T`, not `T`.** `currentTarget` is an
intersection so a handler can read the event's members and the element's. Every
exact-equality assertion about an event target has to say so.

## Not covered here

Typing a reducer's action union (react-core lesson 08 builds one), declaration
merging for `window` and CSS modules, `.d.ts` authoring, and template literal
types. The last two show up in the styling and production modules, where there is
something real to use them on.
