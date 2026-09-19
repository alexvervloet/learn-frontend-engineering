import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { MeasureFirst } from "./lessons/01_measure_first";
import { Compiler } from "./lessons/02_compiler";
import { Virtualization } from "./lessons/03_virtualization";
import { WebVitals } from "./lessons/04_web_vitals";
import { BundleSize } from "./lessons/05_bundle_size";

const lessons = defineLessons([
  {
    id: "01-measure-first",
    group: "Before optimising",
    title: "Measure first",
    summary: "Render counts point at the wrong component. Profiler durations do not.",
    file: "src/lessons/01_measure_first.tsx",
    Component: MeasureFirst,
  },
  {
    id: "02-compiler",
    group: "Before optimising",
    title: "memo, and what the compiler changed",
    summary: "Two identical trees, one directive apart. No memo or useCallback anywhere.",
    file: "src/lessons/02_compiler.tsx",
    Component: Compiler,
  },
  {
    id: "03-virtualization",
    group: "Making it faster",
    title: "Virtualization",
    summary: "Ten thousand rows, twenty in the DOM, and a cost that stops growing.",
    file: "src/lessons/03_virtualization.tsx",
    Component: Virtualization,
  },
  {
    id: "04-web-vitals",
    group: "Making it faster",
    title: "Core Web Vitals",
    summary: "LCP, INP, CLS, the thresholds, and the one line that fixes most layout shift.",
    file: "src/lessons/04_web_vitals.tsx",
    Component: WebVitals,
  },
  {
    id: "05-bundle-size",
    group: "Making it faster",
    title: "Bundle size",
    summary: "Look at the treemap first. The answer is usually one rectangle you did not expect.",
    file: "src/lessons/05_bundle_size.tsx",
    Component: BundleSize,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Performance"
      subtitle="Measure first, the React Compiler, virtualization, Web Vitals, bundle size"
      lessons={lessons}
    />
  );
}
