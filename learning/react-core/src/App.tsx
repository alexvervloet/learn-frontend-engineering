import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { Rendering } from "./lessons/01_rendering";
import { StateSnapshot } from "./lessons/02_state_snapshot";
import { ListsAndKeys } from "./lessons/03_lists_and_keys";
import { NoEffectNeeded } from "./lessons/04_no_effect_needed";
import { EffectsAndCleanup } from "./lessons/05_effects_and_cleanup";
import { RefsAndFocus } from "./lessons/06_refs_and_focus";
import { Context } from "./lessons/07_context";
import { ReducerStateMachine } from "./lessons/08_reducer_state_machine";
import { Transitions } from "./lessons/09_transitions";
import { ActionsAndOptimistic } from "./lessons/10_actions_and_optimistic";
import { SuspenseAndUse } from "./lessons/11_suspense";

const lessons = defineLessons([
  {
    id: "01-rendering",
    group: "How React runs",
    title: "What a render is",
    summary: "A render is React calling your function. Batching and bail-outs follow from that.",
    file: "src/lessons/01_rendering.tsx",
    Component: Rendering,
  },
  {
    id: "02-state-snapshot",
    group: "How React runs",
    title: "State is a snapshot",
    summary: "This render's `count` never changes. Three +1s by value add one.",
    file: "src/lessons/02_state_snapshot.tsx",
    Component: StateSnapshot,
  },
  {
    id: "03-lists-and-keys",
    group: "How React runs",
    title: "Lists and keys",
    summary: "An index key hands one row's state to a different row.",
    file: "src/lessons/03_lists_and_keys.tsx",
    Component: ListsAndKeys,
  },
  {
    id: "04-no-effect-needed",
    group: "Effects",
    title: "You might not need an effect",
    summary: "Mirroring a calculation into state costs a render and a frame of stale UI.",
    file: "src/lessons/04_no_effect_needed.tsx",
    Component: NoEffectNeeded,
  },
  {
    id: "05-effects-and-cleanup",
    group: "Effects",
    title: "Effects and cleanup",
    summary: "An effect connects and disconnects. Skip the disconnect and intervals pile up.",
    file: "src/lessons/05_effects_and_cleanup.tsx",
    Component: EffectsAndCleanup,
  },
  {
    id: "06-refs-and-focus",
    group: "Escape hatches",
    title: "Refs and focus",
    summary: "A ref changes without a render. React 19 passes one as an ordinary prop.",
    file: "src/lessons/06_refs_and_focus.tsx",
    Component: RefsAndFocus,
  },
  {
    id: "07-context",
    group: "Escape hatches",
    title: "Context and re-renders",
    summary: "Every consumer re-renders when the value changes, whatever part of it changed.",
    file: "src/lessons/07_context.tsx",
    Component: Context,
  },
  {
    id: "08-reducer",
    group: "Escape hatches",
    title: "useReducer as a state machine",
    summary: "A discriminated union makes loading-and-error impossible to spell.",
    file: "src/lessons/08_reducer_state_machine.tsx",
    Component: ReducerStateMachine,
  },
  {
    id: "09-transitions",
    group: "Concurrent React",
    title: "Transitions and deferred values",
    summary: "Mark an update interruptible and typing stops competing with a 20,000 row filter.",
    file: "src/lessons/09_transitions.tsx",
    Component: Transitions,
  },
  {
    id: "10-actions",
    group: "Concurrent React",
    title: "Form actions and optimistic UI",
    summary: "useActionState, useFormStatus, and a rollback you did not have to write.",
    file: "src/lessons/10_actions_and_optimistic.tsx",
    Component: ActionsAndOptimistic,
  },
  {
    id: "11-suspense",
    group: "Concurrent React",
    title: "Suspense, lazy, and use()",
    summary: "Read a promise as if it were a value. The promise has to be cached.",
    file: "src/lessons/11_suspense.tsx",
    Component: SuspenseAndUse,
  },
]);

export function App() {
  return (
    <LessonShell
      title="React core"
      subtitle="State, effects, refs, context, reducers, concurrency"
      lessons={lessons}
    />
  );
}
