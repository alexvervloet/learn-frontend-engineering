import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { PropsAndChildren } from "./lessons/01_props_and_children";
import { Events } from "./lessons/02_events";
import { Refs } from "./lessons/03_refs";
import { DiscriminatedUnions } from "./lessons/04_discriminated_unions";
import { GenericComponents } from "./lessons/05_generic_components";
import { ContextAndHooks } from "./lessons/06_context_and_hooks";
import { AsAndSatisfies } from "./lessons/07_as_and_satisfies";

const lessons = defineLessons([
  {
    id: "01-props-and-children",
    group: "The everyday types",
    title: "Props and children",
    summary: "children is ReactNode. Extend the element you wrap instead of retyping it.",
    file: "src/lessons/01_props_and_children.tsx",
    Component: PropsAndChildren,
  },
  {
    id: "02-events",
    group: "The everyday types",
    title: "Events and form data",
    summary: "currentTarget is typed, target is not, and FormData can hand you a File.",
    file: "src/lessons/02_events.tsx",
    Component: Events,
  },
  {
    id: "03-refs",
    group: "The everyday types",
    title: "Refs",
    summary: "The initial value decides the type. ref is an ordinary prop in React 19.",
    file: "src/lessons/03_refs.tsx",
    Component: Refs,
  },
  {
    id: "04-discriminated-unions",
    group: "Designing with types",
    title: "Unions that exclude the nonsense",
    summary: "Exhaustive switches for state, and `?: never` for props that cannot combine.",
    file: "src/lessons/04_discriminated_unions.tsx",
    Component: DiscriminatedUnions,
  },
  {
    id: "05-generic-components",
    group: "Designing with types",
    title: "Generic and polymorphic components",
    summary: "A generic component is a generic function. Polymorphism costs one internal cast.",
    file: "src/lessons/05_generic_components.tsx",
    Component: GenericComponents,
  },
  {
    id: "06-context-and-hooks",
    group: "Designing with types",
    title: "Context and custom hooks",
    summary: "A hook that throws turns `T | null` into `T` for every consumer.",
    file: "src/lessons/06_context_and_hooks.tsx",
    Component: ContextAndHooks,
  },
  {
    id: "07-as-and-satisfies",
    group: "The boundary",
    title: "as, satisfies, and unknown",
    summary: "`as` is you overruling the compiler. Validate once, at the edge, and mean it.",
    file: "src/lessons/07_as_and_satisfies.tsx",
    Component: AsAndSatisfies,
  },
]);

export function App() {
  return (
    <LessonShell
      title="TypeScript with React"
      subtitle="Props, events, refs, unions, generics, and the edge of the type system"
      lessons={lessons}
    />
  );
}
