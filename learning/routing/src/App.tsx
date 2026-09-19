import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { NestedRoutes } from "./lessons/01_nested_routes";
import { LoadersAndActions } from "./lessons/02_loaders_and_actions";
import { SearchParams } from "./lessons/03_search_params";
import { LazyRoutes } from "./lessons/04_lazy_routes";
import { TanstackRouter } from "./lessons/05_tanstack_router";

const lessons = defineLessons([
  {
    id: "01-nested-routes",
    group: "React Router",
    title: "Nested routes and layouts",
    summary: "The URL describes a stack of components, and the layout never unmounts.",
    file: "src/lessons/01_nested_routes.tsx",
    Component: NestedRoutes,
  },
  {
    id: "02-loaders-and-actions",
    group: "React Router",
    title: "Loaders and actions",
    summary: "Fetch before render, so there is no waterfall and no first render without data.",
    file: "src/lessons/02_loaders_and_actions.tsx",
    Component: LoadersAndActions,
  },
  {
    id: "03-search-params",
    group: "React Router",
    title: "The URL as state",
    summary: "Filters and pages belong in the query string. Derive from it, never copy it.",
    file: "src/lessons/03_search_params.tsx",
    Component: SearchParams,
  },
  {
    id: "04-lazy-routes",
    group: "React Router",
    title: "Route-level code splitting",
    summary: "`lazy` defers the component and its loader together, in one chunk.",
    file: "src/lessons/04_lazy_routes.tsx",
    Component: LazyRoutes,
  },
  {
    id: "05-tanstack-router",
    group: "The typed alternative",
    title: "TanStack Router",
    summary: "Paths, params and search keys all checked against the route tree at compile time.",
    file: "src/lessons/05_tanstack_router.tsx",
    Component: TanstackRouter,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Routing"
      subtitle="React Router 8 data routers, the URL as state, TanStack Router"
      lessons={lessons}
    />
  );
}
