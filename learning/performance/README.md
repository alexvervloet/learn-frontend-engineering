# Performance 🟢

Five lessons. The first two are about not optimising the wrong thing; the last
three are the three fixes that actually move numbers.

**The React Compiler is on in this module, and only this module.**
`vite.config.ts` has `react({ compiler: true })`, so lesson 02 can show what it
does rather than describe it. It is off elsewhere because it would quietly
change the render counts the other modules assert.

## What the files cover

| File                    | What it teaches                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `01_measure_first.tsx`  | `<Profiler>` durations against render counts. The cheap panel re-renders five times as often and costs a fraction as much             |
| `02_compiler.tsx`       | Two identical trees, one `"use no memo"` apart. No `memo` or `useCallback` in the file, and the compiled one's child never re-renders |
| `03_virtualization.tsx` | Ten thousand rows, about twenty in the DOM, and the windowing arithmetic written out                                                  |
| `04_web_vitals.tsx`     | LCP, INP, CLS, the published thresholds, and reserving space as the fix for most layout shift                                         |
| `05_bundle_size.tsx`    | Read the treemap first. A dynamic `import()` that the build output proves is a separate chunk                                         |

## Run it

```bash
npm install                         # from the repo root, once
npm run dev -w learning/performance
npm test -- --project performance
npm run analyse -w learning/performance   # writes dist/stats.html
```

## `@vitejs/plugin-react` 6 does not use Babel any more

This cost an hour, and every instruction written before plugin-react 6 is now
wrong. The old way:

```ts
react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } });
```

Plugin-react 6 transforms with **oxc**, not Babel. There is no `babel` option,
so the above is silently ignored: the build succeeds, nothing warns, and no
component is compiled. The real API is a flag, and it needs a separate package:

```bash
npm i -D oxc-transform-react
```

```ts
react({ compiler: true });
```

The way to tell the difference is to look at the output. A compiled component
starts with `const $ = _c(n)`:

```ts
expect(Probe.toString()).toContain("_c(");
```

## What the tests can and cannot prove here

Lesson 03 is the clearest case in the repo of jsdom running out. A virtualizer
measures a scroll container; jsdom does no layout, so every element reports
0×0, the virtualizer correctly decides nothing is visible, and it renders no
rows at all. Mocking `getBoundingClientRect` and firing a fake `ResizeObserver`
gets part of the way and no further, and at that point the test is asserting
about the stubs.

So the split is explicit:

| Claim                               | Where it is checked                                                 |
| ----------------------------------- | ------------------------------------------------------------------- |
| The windowing arithmetic            | `visibleWindow` here, in jsdom                                      |
| The scroll height is `count × size` | Here. It needs no measurement                                       |
| **About twenty rows reach the DOM** | `learning/testing/e2e/virtualization.spec.ts`, in Chromium          |
| The Web Vitals bucketing            | `rating` here                                                       |
| The actual LCP, INP, CLS            | Nowhere in CI. Field data from real users is the only honest source |
| The chart is a separate chunk       | Against the build config here, and visible in `dist/`               |

## The compiler tells you when it gives up

Lesson 03 lints with a warning, and it is the useful kind:

```
react-hooks/incompatible-library
TanStack Virtual's `useVirtualizer()` API returns functions that cannot be
memoized safely
```

The virtualizer returns methods that read mutable internal state, so caching
their results would serve stale rows. The compiler declines to optimise that
component and the lint rule says so, which is worth knowing: "the compiler
handles it" is true until it is not, and you find out at build time rather
than through a subtle bug.

## Three things worth remembering

**Render counts point at the wrong component.** Lesson 01's cheap panel
re-renders five times as often as the expensive one and costs a fraction as
much. Rank by `actualDuration`, not by how often something ran.

**The compiler caches in the parent, not the child.** The first version of
lesson 02 put `"use no memo"` on the child and nothing changed, because what
gets cached is the _element the parent creates_. That is also why `memo` on a
child never helped when the parent passed a fresh arrow function.

**Measure a production build.** Development React is several times slower and
StrictMode renders everything twice.

## Not covered here

`useDeferredValue` and `useTransition` for INP (react-core lesson 09 covers
them), image formats and responsive `srcset`, font loading strategies, service
worker caching, server-side rendering as an LCP fix, and long-task
instrumentation. Server rendering gets its own module.
