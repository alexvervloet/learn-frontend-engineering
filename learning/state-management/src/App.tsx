import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { WhereStateLives } from "./lessons/01_where_state_lives";
import { Selectors } from "./lessons/02_selectors";
import { Zustand } from "./lessons/03_zustand";
import { ReduxToolkit } from "./lessons/04_redux_toolkit";
import { JotaiLesson } from "./lessons/05_jotai";

const lessons = defineLessons([
  {
    id: "01-where-state-lives",
    group: "The decision",
    title: "Where state belongs",
    summary: "Local, lifted, the URL, a query cache, a store. In that order.",
    file: "src/lessons/01_where_state_lives.tsx",
    Component: WhereStateLives,
  },
  {
    id: "02-selectors",
    group: "The decision",
    title: "Subscribing to a slice",
    summary: "The thing context cannot do, in thirty lines of useSyncExternalStore.",
    file: "src/lessons/02_selectors.tsx",
    Component: Selectors,
  },
  {
    id: "03-zustand",
    group: "The libraries",
    title: "Zustand",
    summary: "No provider, actions in the store, and a persist middleware with a sharp edge.",
    file: "src/lessons/03_zustand.tsx",
    Component: Zustand,
  },
  {
    id: "04-redux-toolkit",
    group: "The libraries",
    title: "Redux Toolkit",
    summary: "Reducers that look like mutations, and what the devtools still buy you.",
    file: "src/lessons/04_redux_toolkit.tsx",
    Component: ReduxToolkit,
  },
  {
    id: "05-jotai",
    group: "The libraries",
    title: "Jotai",
    summary: "Many small atoms instead of one store, with a dependency graph nobody declared.",
    file: "src/lessons/05_jotai.tsx",
    Component: JotaiLesson,
  },
]);

export function App() {
  return (
    <LessonShell
      title="State management"
      subtitle="Where state belongs, and what each library buys"
      lessons={lessons}
    />
  );
}
