# Learning Frontend Engineering with React

A public, open learning resource for building frontends with React and
TypeScript. It starts at the browser platform React sits on, works through the
library itself, and ends at the things that only matter once real users load
your bundle: caching, accessibility, bundle size, error tracking, deploys.

Every module is concept-focused, self-contained, and runnable. Clone it, work
through it at your own pace.

## How the lessons work

Backend lessons print to a terminal. Frontend lessons need a browser, so each
lesson here is two things at once:

1. **A component you can click.** `npm run dev -w learning/react-core` opens a
   sidebar of lessons. Every one is a working demo, and the sidebar tells you
   which file it came from.
2. **A test that asserts what the lesson claims.** Same file, `.test.tsx`
   alongside. `npm test` runs every module's suite headlessly.

The second point is the one that matters. A tutorial rots silently. A tutorial
whose claims are assertions fails CI when React changes under it.

## Structure

| Folder                                 | What's in it                                                              |
| -------------------------------------- | ------------------------------------------------------------------------- |
| [web-fundamentals/](web-fundamentals/) | The browser platform, with no React in sight                              |
| [learning/](learning/)                 | One workspace per concept module                                          |
| [projects/](projects/)                 | Capstone apps that combine the modules                                    |
| [packages/](packages/)                 | Shared internals. Only `lesson-shell`, the sidebar the modules mount into |

## What is here so far

Built and tested: [web-fundamentals](web-fundamentals/),
[learning/react-core](learning/react-core/),
[learning/typescript-react](learning/typescript-react/),
[learning/styling](learning/styling/),
[learning/routing](learning/routing/),
[learning/state-management](learning/state-management/),
[learning/forms](learning/forms/),
[learning/testing](learning/testing/),
[learning/performance](learning/performance/),
[learning/accessibility](learning/accessibility/),
[learning/rendering-strategies](learning/rendering-strategies/),
[learning/next-app-router](learning/next-app-router/),
[learning/data-fetching](learning/data-fetching/), and the shared
[lesson-shell](packages/lesson-shell/). Everything else in the path below is
marked planned and has no folder yet. `npm test` runs 438 assertions across the
thirteen modules that exist, plus 34 Playwright specs in a real browser, including type-level ones.

## Suggested learning path

Each module stands alone, so skip ahead if a topic is already familiar.

1. **[web-fundamentals/](web-fundamentals/)** — the DOM, the event loop, fetch,
   storage, and the rendering pipeline. React is an abstraction over all of it,
   and the abstraction leaks.
2. **[learning/react-core/](learning/react-core/)** — state, effects, refs,
   context, reducers, Suspense, transitions. The largest module, and the one
   everything else assumes.
3. **[learning/typescript-react/](learning/typescript-react/)** — typing props,
   children, events, refs, generic components, and state that cannot be invalid.
4. **[learning/styling/](learning/styling/)** — CSS modules, Tailwind 4, design
   tokens, dark mode, container queries, animation.
5. **[learning/routing/](learning/routing/)** — React Router 8 data routers and
   TanStack Router, nested layouts, and the URL as state.
6. **[learning/data-fetching/](learning/data-fetching/)** — TanStack Query,
   caching, mutations, optimistic updates, and mocking a network with MSW.
7. **[learning/state-management/](learning/state-management/)** — where state
   belongs, and what Zustand, Redux Toolkit and Jotai each buy you.
8. **[learning/forms/](learning/forms/)** — React Hook Form with Zod, validation
   UX, and errors a screen reader announces.
9. **[learning/testing/](learning/testing/)** — Vitest, Testing Library,
   Playwright, Storybook.
10. **[learning/accessibility/](learning/accessibility/)** — semantics, keyboard
    order, focus management, and axe in CI.
11. **[learning/performance/](learning/performance/)** — the React Compiler,
    code splitting, virtualization, Core Web Vitals, bundle analysis.
12. **Rendering off the client** —
    [rendering-strategies](learning/rendering-strategies/) for the concepts,
    then [next-app-router](learning/next-app-router/) and
    astro-islands (planned).
13. **learning/production** (planned) — env config, CSP, auth in
    the browser, Sentry, analytics, feature flags, i18n, PWA, Docker, CI/CD.
14. **[projects/](projects/)** — read and run
    bookmark-manager (planned) first, then the others.

### What each module needs to run

| Icon | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 🟢   | Nothing but `npm install`. Runs in a browser tab or in jsdom            |
| 🎭   | Playwright browsers (`npx playwright install`)                          |
| 🌐   | A backend. Every module that wants one can use MSW instead, and says so |
| 🐳   | Docker                                                                  |
| ☁️   | An account somewhere (Sentry, a host, a feature-flag service)           |

Each module's README states exactly what it needs.

## Modules

### web-fundamentals

The platform React compiles down to. Event loop and task queues, DOM APIs and
event delegation, the rendering pipeline, `fetch` with abort and caching
headers, cookies vs `localStorage` vs IndexedDB, ES modules and tree shaking.

### learning/

- **react-core** — rendering, state, props, lists and keys, effects and when not
  to use one, refs, context, `useReducer`, composition, custom hooks, portals,
  error boundaries, Suspense, `useTransition`, `useOptimistic`, `useActionState`
- **[typescript-react](learning/typescript-react/)** — props and children, events, `ref` as a prop in React 19,
  generic and polymorphic components, discriminated unions for state, type-safe
  context, when `as` is a bug
- **[styling](learning/styling/)** — CSS modules, Tailwind 4 and its CSS-first config, design tokens
  with custom properties, dark mode, container queries, cascade layers,
  `class-variance-authority` and the shadcn/ui pattern, animation with Motion
- **[routing](learning/routing/)** — React Router 8 data routers, loaders and actions, nested
  layouts, route-level code splitting, TanStack Router's type-safe params,
  search params as application state
- **data-fetching** — `fetch` in an effect and why it goes wrong, TanStack Query
  (cache keys, staleness, invalidation, mutations, optimistic updates, infinite
  queries, prefetching), SWR for contrast, MSW as the test network, retries,
  error and loading states that do not flash
- **[state-management](learning/state-management/)** — local vs lifted vs context vs store, the server/client
  state split, Zustand, Redux Toolkit, Jotai, selectors and the re-render cost
  of getting it wrong
- **[forms](learning/forms/)** — controlled and uncontrolled inputs, React Hook Form with a Zod
  schema, async validation, field arrays, file upload, `useActionState`,
  accessible error messaging
- **[testing](learning/testing/)** — Vitest, Testing Library and querying by role, `user-event`, MSW,
  what belongs in a unit test and what does not, Playwright end to end,
  Storybook 10 with interaction and a11y tests, coverage that means something
- **[accessibility](learning/accessibility/)** — semantic HTML first, the accessibility tree, keyboard
  order, focus management in dialogs and route changes, live regions, ARIA
  patterns, axe in CI
- **[performance](learning/performance/)** — the React Profiler, `memo`/`useMemo`/`useCallback` and how
  the React Compiler changes that advice, `Suspense` and lazy routes,
  virtualization with TanStack Virtual, images, Core Web Vitals, reading a
  bundle analysis
- **[rendering-strategies](learning/rendering-strategies/)** — CSR, SSR, SSG, ISR and streaming, hand-rolled
  against React's own APIs so the framework versions stop being magic
- **[next-app-router](learning/next-app-router/)** — Next 16, Server Components, server actions, streaming
  and caching, route handlers, the client/server boundary
- **astro-islands** — Astro 7, partial hydration, and when a React SPA is the
  wrong answer
- **production** — build output and env config, Content Security Policy and XSS,
  where a token can safely live, Sentry, RUM and Core Web Vitals in the field,
  feature flags, i18n with react-i18next, PWA and offline, Docker and nginx,
  CI/CD and preview deploys

### projects/

- **bookmark-manager** — React Router, TanStack Query, React Hook Form, tested
  end to end, containerised
- **dashboard** — charts, virtualised tables, keyboard-complete, measured
- **next-storefront** — Server Components, server actions, ISR

## Setup

Node 24 or newer (`.nvmrc` pins it).

```bash
npm install     # every workspace, from the repo root
npm test        # every module's Vitest suite
npm run typecheck
npm run lint
npm run build
```

Work inside one module:

```bash
npm run dev -w learning/react-core        # http://localhost:5173
npm test -- --project react-core
npm run typecheck -w learning/react-core
```

`npm install` ends with a warning the first time:

```
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts
```

npm 11 does not run install scripts unless you approve them, and esbuild's is
what downloads its binary. The approvals are already committed in the root
`package.json` under `allowScripts`; if you see the warning for a package that
is not listed, run `npm install-scripts approve <pkg>`.

### How this repo is set up

| Choice                        | Why                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm workspaces                | One `npm install`, but a module that needs Next or Astro is not forced on the ones that do not. React resolves to a single copy at the root, which is what stops the "two Reacts" hook error |
| `moduleResolution: "bundler"` | Vite resolves imports, so relative imports have no extension. The backend repo's `.js` suffixes are a Node requirement and do not apply here                                                 |
| Vitest over Jest              | It reuses the Vite config, so tests see the same aliases, plugins and transforms as the dev server. Nothing to keep in sync                                                                  |
| jsdom over happy-dom          | Slower, but closer to a real browser on focus, layout and events, and lessons about focus depend on that                                                                                     |
| ESLint over Biome             | Biome is faster and one tool instead of two. React's lint rules are the reason: `eslint-plugin-react-hooks` ships the React Compiler check, and there is no equivalent                       |
| TypeScript 5.9, not 7         | typescript-eslint does not support TypeScript 7 yet, and it supplies the parser. See [LESSONS.md](LESSONS.md)                                                                                |

Versions were pinned from the registry in September 2026: React 19.3, Vite 8,
Vitest 5, TypeScript 5.9, Tailwind 4.3, React Router 8, TanStack Query 5.103,
Next 16.3, Storybook 10, Playwright 1.63, MSW 2.15, Zod 4.6.

## Related

[Practice-Backends](https://github.com/alexvervloet/learn-javascript-backend-engineering)
is the same idea for the server side: Express, Prisma, auth, queues, Docker, and
LLM APIs in TypeScript. Several projects here are built to talk to the APIs
built there.
