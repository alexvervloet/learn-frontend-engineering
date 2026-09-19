# Routing 🟢

Five lessons on React Router 8 and the alternative that types the URL. Nested
layouts, loading data before render, treating the query string as state,
splitting on route boundaries, and what TanStack Router buys for the extra
ceremony.

## What the files cover

| File                         | What it teaches                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_nested_routes.tsx`       | The URL describes a stack of components. `Outlet`, index routes, relative links, and a splat route that says something useful                            |
| `02_loaders_and_actions.tsx` | Fetching before render removes the request waterfall. `useNavigation` for pending UI, `Form` + action, and throwing a `Response` so a 404 reads as a 404 |
| `03_search_params.tsx`       | Filters and pages belong in the URL. Derive from it, never copy it. `replace` while the user is adjusting something                                      |
| `04_lazy_routes.tsx`         | `lazy` defers the component _and_ its loader in one chunk, which `React.lazy` cannot do                                                                  |
| `05_tanstack_router.tsx`     | Paths, params and search keys checked against the route tree. `validateSearch` parses once at the boundary                                               |

`src/data.ts` is the shared fake API.

## Run it

```bash
npm install                     # from the repo root, once
npm run dev -w learning/routing
npm test -- --project routing
```

## Every lesson uses a memory router

Not `createBrowserRouter`. Two reasons, and the second is the useful one.

The lesson shell already owns the real URL, using the hash to pick a lesson. A
browser router inside it would fight over the same address bar.

And `createMemoryRouter` with `initialEntries` is how you test a router anyway.
Every test in this module starts at whatever path it cares about with no mocking
and no `window.location` manipulation, and `router.state.location` is readable
afterwards. The demo and the test run the same routes object, exported from the
lesson.

```tsx
const router = createMemoryRouter(routes, { initialEntries: ["/articles"] });
render(<RouterProvider router={router} />);
```

## `react-router-dom` is not a thing any more

It stopped at 7.18 and is a deprecated re-export shim. From v7 on, everything
comes from `react-router`, including `Link`, `RouterProvider` and the DOM-only
pieces. Anything telling you to install `react-router-dom` is pre-v7.

## Two things worth knowing before you choose

**Loaders are not a cache.** They fix the waterfall and give you data on the
first render, but going back to a list re-runs its loader. TanStack Query fixes
that and does not fix the waterfall. Plenty of apps run both, with the loader
calling `queryClient.ensureQueryData`.

**Actions revalidate everything on the page.** You do not say which data went
stale, which is less bookkeeping than `invalidateQueries` and refetches things
that did not change. Which trade is right depends on how expensive your loaders
are.

## The type checker found the bug the lesson is about

The TanStack Router lesson had `<Link to="/">Index</Link>` in its nav. `tsc`
rejected it: the index route declares search params, so a link to it has to
supply them.

React Router would have accepted the same link and rendered `page NaN`. That
one error is a fair summary of the whole trade the lesson describes.

## Not covered here

`useFetcher` for writes that should not navigate, `useBlocker` for unsaved-changes
prompts, scroll restoration, view transitions, and framework mode with its file
routes and typegen. Framework mode overlaps heavily with Next, so it belongs
next to that comparison rather than here.
