import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { TheTree } from "./lessons/01_the_tree";
import { Keyboard } from "./lessons/02_keyboard";
import { FocusManagement } from "./lessons/03_focus_management";
import { LiveRegions } from "./lessons/04_live_regions";
import { Axe } from "./lessons/05_axe";

const lessons = defineLessons([
  {
    id: "01-the-tree",
    group: "The model",
    title: "The accessibility tree",
    summary: "Role, name, state. A div has none of the three, and looks identical.",
    file: "src/lessons/01_the_tree.tsx",
    Component: TheTree,
  },
  {
    id: "02-keyboard",
    group: "Operating it",
    title: "Keyboard order",
    summary: "Tab order is DOM order. A toolbar should be one stop, not twenty.",
    file: "src/lessons/02_keyboard.tsx",
    Component: Keyboard,
  },
  {
    id: "03-focus-management",
    group: "Operating it",
    title: "Focus management",
    summary: "Where focus goes when a dialog opens, a row is deleted, or a route changes.",
    file: "src/lessons/03_focus_management.tsx",
    Component: FocusManagement,
  },
  {
    id: "04-live-regions",
    group: "Operating it",
    title: "Live regions",
    summary: "The region has to exist before the content, or nothing is announced.",
    file: "src/lessons/04_live_regions.tsx",
    Component: LiveRegions,
  },
  {
    id: "05-axe",
    group: "Checking it",
    title: "axe, and what it cannot see",
    summary: "It catches about a third. The third panel here passes and is unusable.",
    file: "src/lessons/05_axe.tsx",
    Component: Axe,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Accessibility"
      subtitle="The tree, the keyboard, focus, announcements, and the limits of automation"
      lessons={lessons}
    />
  );
}
