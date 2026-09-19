# Rendering strategies 🟢

Five lessons on where React runs, built against React's own server APIs rather
than a framework's wrapper around them. Once `renderToString`,
`renderToReadableStream` and `hydrateRoot` stop being magic, Next and Astro are
much easier to read.

## What the files cover

| File               | What it teaches                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `01_csr.tsx`       | An empty div and a script. The fixed order that makes content wait on the bundle, and when that is still the right call |
| `02_hydration.tsx` | The four causes of a mismatch, the fix that is not `typeof window`, and `onRecoverableError`                            |
| `03_streaming.tsx` | Send the shell now. Suspense boundaries as a performance decision, not a loading-state one                              |
| `04_ssg_isr.tsx`   | Serve stale, rebuild behind. A simulator running the real store                                                         |
| `05_choosing.tsx`  | Three questions, five strategies, no free option                                                                        |

| Under `src/render/` | What it is                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `page.tsx`          | The app every strategy renders, and the document shell around it                            |
| `ssr.ts`            | `renderToString` plus the serialised data the client needs                                  |
| `stream.ts`         | `renderToReadableStream`, collected chunk by chunk                                          |
| `ssg.ts`            | An ISR store: revalidate window, background rebuild, stampede guard, on-demand invalidation |

## Run it

```bash
npm install                               # from the repo root, once
npm run dev -w learning/rendering-strategies
npm test -- --project rendering-strategies
```

## The server tests run in Node, on purpose

Three test files start with a docblock:

```ts
// @vitest-environment node
```

`renderToString` is what a server runs, and a server has no `window`. Running
those tests in jsdom would let a component reach for `document`, pass, and
crash on the first real request. One of the assertions is exactly that:

```ts
expect(typeof globalThis.window).toBe("undefined");
expect(() => renderBody(<UsesWindow />)).toThrow(/window is not defined/);
```

The streaming tests assert the chunk boundaries rather than the final HTML:
that the first chunk contains the shell and the fallback and _not_ the slow
content, and that the slow content turns up later in the same response. That
is the only assertion that distinguishes streaming from `renderToString`.

## Hydration mismatches do not go to console.error

The first version of the hydration test spied on `console.error` and found
nothing, twice, while React was visibly reporting a mismatch. React 19 hands
recoverable errors to a callback on the root and only falls back to the
console if you have not supplied one:

```ts
hydrateRoot(container, <App />, {
  onRecoverableError: (error) => report(error),
});
```

That is also the answer for production. Without it, every hydration mismatch
your users hit exists only in their console, where nobody is looking.

The tests also hydrate _real_ server markup: `renderToString` into a
container, then `hydrateRoot` over it. That is what a browser does with a
server-rendered page, and it is the only way to see a mismatch without running
a server.

## Two lint rules worth arguing with

The React Compiler rules in `eslint-plugin-react-hooks` fire twice in this
module, and both are instructive rather than annoying.

`react-hooks/purity` flags `Date.now()` in `UnstableTimestamp`. That is the
lesson: the rule that keeps the compiler able to optimise a component is the
same rule that keeps hydration working. Impure render means no optimisation
_and_ a server/client mismatch. One cause, three symptoms.

`react-hooks/set-state-in-effect` flags `ClientOnlyTimestamp`, which is the
recommended fix for a mismatch. The rule is aimed at state derived from props,
where a calculation would do; here the value genuinely does not exist until
the client is running. One extra render is the price of matching the server on
the first one. Both are disabled on the line, with the reason.

## Serve stale, rebuild behind

`src/render/ssg.ts` is ISR in about forty lines, and its test fires ten
simultaneous requests the instant the page expires and asserts **two** renders,
not eleven. Without the `pending` guard, a burst after expiry starts one
rebuild per request. It is the cache stampede from the backend repo's caching
module in a different hat, and the same shape as `stale-while-revalidate` and
TanStack Query's `staleTime`. That pattern keeps reappearing because it is the
only way to have a fast response and fresh data at once.

## Not covered here

React Server Components, which are a different thing from server rendering and
get their own module. Resumability (Qwik). Partial prerendering. Edge runtimes
and their missing Node APIs. Session-aware caching, where personalisation and
a CDN meet and one of them has to lose.

Next is [next-app-router](../next-app-router/), which implements all of this
and adds RSC on top.
