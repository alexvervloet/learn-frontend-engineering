import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { Queries } from "./lessons/01_queries";
import { Async } from "./lessons/02_async";
import { Mocking } from "./lessons/03_mocking";
import { WhatNotToTest } from "./lessons/04_what_not_to_test";
import { Layers } from "./lessons/05_layers";

const lessons = defineLessons([
  {
    id: "01-queries",
    group: "Writing a good test",
    title: "Finding things like a user",
    summary: "A component a test cannot find by role is one a screen reader cannot announce.",
    file: "src/lessons/01_queries.tsx",
    Component: Queries,
  },
  {
    id: "02-async",
    group: "Writing a good test",
    title: "getBy, queryBy, findBy",
    summary: "Three queries, one job each, and the act warning that means you forgot an await.",
    file: "src/lessons/02_async.tsx",
    Component: Async,
  },
  {
    id: "03-mocking",
    group: "Writing a good test",
    title: "Mocking, and how little you need",
    summary: "vi.fn, vi.spyOn, the vi.mock hoisting trap, and why not to mock the network.",
    file: "src/lessons/03_mocking.tsx",
    Component: Mocking,
  },
  {
    id: "04-what-not-to-test",
    group: "Writing a good test",
    title: "What not to test",
    summary: "Two tests of one component: one breaks on a rename, one breaks when it is broken.",
    file: "src/lessons/04_what_not_to_test.tsx",
    Component: WhatNotToTest,
  },
  {
    id: "05-layers",
    group: "Choosing a tool",
    title: "Which test, and where",
    summary: "jsdom's ceiling, and the Playwright suite that finishes what it could not check.",
    file: "src/lessons/05_layers.tsx",
    Component: Layers,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Testing"
      subtitle="Vitest, Testing Library, Storybook, Playwright"
      lessons={lessons}
    />
  );
}
