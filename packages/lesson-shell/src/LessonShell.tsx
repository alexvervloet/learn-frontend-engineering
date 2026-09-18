import { useMemo } from "react";

import { LessonBoundary } from "./LessonBoundary";
import type { Lesson } from "./types";
import { useHash } from "./useHash";

type Props = {
  /** Module name, shown at the top of the sidebar. */
  title: string;
  /** One line under it saying what the module covers. */
  subtitle: string;
  lessons: readonly Lesson[];
};

function groupLessons(lessons: readonly Lesson[]): [string, Lesson[]][] {
  const groups = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const existing = groups.get(lesson.group);
    if (existing) existing.push(lesson);
    else groups.set(lesson.group, [lesson]);
  }
  // Map preserves insertion order, so the sidebar order is the array order.
  return [...groups];
}

export function LessonShell({ title, subtitle, lessons }: Props) {
  const [hash, setHash] = useHash();
  const groups = useMemo(() => groupLessons(lessons), [lessons]);

  // An unknown hash (a stale bookmark, a typo) falls back to the first lesson
  // rather than rendering nothing.
  const active = lessons.find((lesson) => lesson.id === hash) ?? lessons[0];

  if (active === undefined) {
    return <p className="lesson-empty">This module has no lessons yet.</p>;
  }

  return (
    <div className="lesson-layout">
      <nav className="lesson-nav" aria-label="Lessons">
        <div className="lesson-nav-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {groups.map(([group, groupLessonList]) => (
          <section key={group}>
            <h2>{group}</h2>
            <ul>
              {groupLessonList.map((lesson) => (
                <li key={lesson.id}>
                  <a
                    href={`#${lesson.id}`}
                    aria-current={lesson.id === active.id ? "page" : undefined}
                    onClick={(event) => {
                      // Let a middle-click or cmd-click open a new tab as usual.
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      setHash(lesson.id);
                    }}
                  >
                    {lesson.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <main className="lesson-main">
        <header className="lesson-head">
          <h2>{active.title}</h2>
          <p>{active.summary}</p>
          <code>{active.file}</code>
        </header>

        <div className="lesson-demo">
          {/*
            The key remounts the demo when the lesson changes. Without it React
            would reconcile two different lesson components into one another and
            carry state across, which makes every lesson after the first start
            in a state its author never wrote.
          */}
          <LessonBoundary resetKey={active.id}>
            <active.Component key={active.id} />
          </LessonBoundary>
        </div>
      </main>
    </div>
  );
}
