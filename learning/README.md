# Learning modules

One npm workspace per concept. Each is a Vite app whose lessons are browsable
from a sidebar and asserted by a Vitest suite in the same folder.

```bash
npm run dev -w learning/<module>
npm test -- --project <module>
```

## Modules

| Module                          | Needs | What it covers                                                 |
| ------------------------------- | ----- | -------------------------------------------------------------- |
| [react-core](react-core/)       | 🟢    | State, effects, refs, context, reducers, transitions, Suspense |
| [data-fetching](data-fetching/) | 🟢    | TanStack Query, caching, mutations, optimistic updates, MSW    |

## Planned

typescript-react, styling, routing, state-management, forms, testing,
accessibility, performance, rendering-strategies, next-app-router,
astro-islands, production. The root [README](../README.md) says what each one
will cover.

## Adding one

1. `learning/<name>/` with a `package.json` named `<name>`, a `tsconfig.json`
   extending `../../tsconfig.base.json`, a `vite.config.ts` and a
   `vitest.config.ts` calling `reactProject("<name>")`.
2. Numbered lesson files in `src/lessons/`, each with a `.test.tsx` beside it.
3. An `App.tsx` that hands the lessons to
   [`LessonShell`](../packages/lesson-shell/).
4. A README with a table saying what each file teaches.

Copy [react-core](react-core/) and delete the lessons. Nothing else is needed:
the root `vitest.config.ts` picks up `learning/*` by glob, and so does
`npm run typecheck`.
