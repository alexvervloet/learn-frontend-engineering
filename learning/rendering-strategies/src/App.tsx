import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { Csr } from "./lessons/01_csr";
import { Hydration } from "./lessons/02_hydration";
import { Streaming } from "./lessons/03_streaming";
import { SsgIsr } from "./lessons/04_ssg_isr";
import { Choosing } from "./lessons/05_choosing";

const lessons = defineLessons([
  {
    id: "01-csr",
    group: "On the client",
    title: "Client-side rendering",
    summary: "An empty div and a script. Everything waits for the bundle.",
    file: "src/lessons/01_csr.tsx",
    Component: Csr,
  },
  {
    id: "02-hydration",
    group: "On the server",
    title: "Hydration, and how it breaks",
    summary: "Four causes of a mismatch, and the callback that reports them in production.",
    file: "src/lessons/02_hydration.tsx",
    Component: Hydration,
  },
  {
    id: "03-streaming",
    group: "On the server",
    title: "Streaming",
    summary: "Send the shell now. Suspense boundaries decide what is allowed to be late.",
    file: "src/lessons/03_streaming.tsx",
    Component: Streaming,
  },
  {
    id: "04-ssg-isr",
    group: "Ahead of time",
    title: "Static generation and ISR",
    summary: "Serve stale, rebuild behind. A simulator over the real store.",
    file: "src/lessons/04_ssg_isr.tsx",
    Component: SsgIsr,
  },
  {
    id: "05-choosing",
    group: "Ahead of time",
    title: "Choosing",
    summary: "Three questions, five strategies, and no free option.",
    file: "src/lessons/05_choosing.tsx",
    Component: Choosing,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Rendering strategies"
      subtitle="CSR, SSR, streaming, SSG and ISR, against React's own APIs"
      lessons={lessons}
    />
  );
}
