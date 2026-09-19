# Learning modules

One npm workspace per concept. Each is a Vite app whose lessons are browsable
from a sidebar and asserted by a Vitest suite in the same folder.

```bash
npm run dev -w learning/<module>
npm test -- --project <module>
```

## Modules

| Module                                        | Needs | What it covers                                                                                       |
| --------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------- |
| [react-core](react-core/)                     | 🟢    | State, effects, refs, context, reducers, transitions, Suspense                                       |
| [typescript-react](typescript-react/)         | 🟢    | Props, events, refs, unions, generics, context, and the boundary. Asserts types as well as behaviour |
| [styling](styling/)                           | 🟢    | CSS modules, Tailwind 4, design tokens, container queries, cascade layers, cva, motion               |
| [routing](routing/)                           | 🟢    | React Router 8 data routers, the URL as state, code splitting, TanStack Router                       |
| [state-management](state-management/)         | 🟢    | Where state belongs, the cost of lifting, Zustand, Redux Toolkit, Jotai                              |
| [forms](forms/)                               | 🟢    | Controlled vs uncontrolled, React Hook Form, Zod, accessible errors, field arrays                    |
| [testing](testing/)                           | 🟢 🎭 | Vitest and Testing Library, Storybook stories run in Vitest, Playwright against the styling module   |
| [performance](performance/)                   | 🟢    | Profiler over render counts, the React Compiler, virtualization, Web Vitals, bundle size             |
| [accessibility](accessibility/)               | 🟢    | The accessibility tree, keyboard order, focus management, live regions, axe                          |
| [rendering-strategies](rendering-strategies/) | 🟢    | CSR, SSR, streaming, SSG and ISR against React's own server APIs                                     |
| [next-app-router](next-app-router/)           | 🟢 🎭 | Next 16: Server Components, the client boundary, streaming, server actions                           |
| [astro-islands](astro-islands/)               | 🟢 🎭 | Astro 7: zero JavaScript by default, and hydrating only what needs it                                |
| [production](production/)                     | 🟢 🐳 | Env config, XSS and CSP, auth storage, error reporting, feature flags, i18n, Docker and nginx        |
| [data-fetching](data-fetching/)               | 🟢    | TanStack Query, caching, mutations, optimistic updates, MSW                                          |

## All of them are built

Every module listed above is complete, with a README of its own. The
[projects](../projects/) folder is what remains.

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
