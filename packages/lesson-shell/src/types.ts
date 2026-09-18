import type { ComponentType } from "react";

/** One lesson: a runnable component plus the prose that frames it. */
export type Lesson = {
  /** Stable slug. It ends up in the URL hash, so renaming one breaks bookmarks. */
  id: string;
  /** Sidebar heading this lesson sits under. */
  group: string;
  title: string;
  /** One sentence, shown above the demo. Say what the lesson proves. */
  summary: string;
  /** Path from the module root, so a reader can find the source of what they are looking at. */
  file: string;
  Component: ComponentType;
};

/**
 * Identity function. It exists only so that `defineLessons([...])` checks the
 * array against `Lesson` at the point of definition, where the error lands on
 * the offending object, instead of at the call site of the shell.
 */
export function defineLessons(lessons: readonly Lesson[]): readonly Lesson[] {
  return lessons;
}
