# @lab/lesson-shell

The sidebar and runner every learning module mounts its lessons into. Not a
lesson itself, and nothing here is worth copying into an app.

It exists so a module can be a list of components and a README, with no layout
code of its own.

## Use it

```tsx
import { LessonShell, defineLessons } from "@lab/lesson-shell";
import "@lab/lesson-shell/styles.css";

const lessons = defineLessons([
  {
    id: "01-rendering",
    group: "Rendering",
    title: "What a render actually is",
    summary: "A render is React calling your function. It is not a DOM update.",
    file: "src/lessons/01_rendering.tsx",
    Component: Rendering,
  },
]);

export default function App() {
  return <LessonShell title="React core" subtitle="…" lessons={lessons} />;
}
```

`id` goes in the URL hash, so `#01-rendering` deep-links to one lesson and
survives a refresh. Renaming an id breaks anyone's bookmark.

## Exports

| Export                         | What it is                                                      |
| ------------------------------ | --------------------------------------------------------------- |
| `LessonShell`                  | Sidebar, lesson header, and the mounted demo                    |
| `defineLessons`                | Identity function that type-checks the array where you write it |
| `LessonBoundary`               | Error boundary around each demo, reset when the lesson changes  |
| `useHash`                      | Reads the URL hash through `useSyncExternalStore`               |
| `@lab/lesson-shell/styles.css` | Layout, colours, and a few shared form primitives               |

## Two decisions worth knowing about

**The demo is keyed by lesson id.** React reconciles by position, so without a
`key` it would treat lesson two's component as an update of lesson one's and
carry state across. Every lesson would start in a state its author never wrote.

**The active lesson lives in the URL, not in state.** `useHash` subscribes to
`hashchange` through `useSyncExternalStore`. Copying the hash into `useState`
would give two sources of truth that disagree the moment someone presses Back.

## CSS the lessons can use

`styles.css` ships a few classes so lessons stay about React instead of layout:
`.row`, `.stack`, `.note`, `.log`, plus base styling for `button`, `input`,
`select` and `textarea`.
