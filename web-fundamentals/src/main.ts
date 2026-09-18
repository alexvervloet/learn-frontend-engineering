/*
 * The sidebar, written by hand.
 *
 * Every other module in this repo mounts its lessons into a React shell. This
 * one does not, on purpose. Roughly sixty lines below do what React does for
 * you: pick a view from the URL, swap it when the URL changes, and tear the old
 * one down before building the new one.
 *
 * Read it once, then notice what is missing. Nothing batches these DOM writes.
 * Nothing stops a teardown being skipped. There is no diff, so the whole panel
 * is destroyed and rebuilt on every change, and any scroll position or focus
 * inside it is lost. Those are the problems React exists to solve, and they are
 * much easier to appreciate after seeing them.
 */
import "@lab/lesson-shell/styles.css";

import { lessons } from "./lessons";
import { must, type Lesson } from "./types";

const app = must<HTMLDivElement>(document, "#app");

function currentLesson(): Lesson {
  const id = window.location.hash.replace(/^#/, "");
  const match = lessons.find((lesson) => lesson.id === id);
  // Unknown hash falls back rather than rendering an empty page.
  const first = lessons[0];
  if (!first) throw new Error("no lessons registered");
  return match ?? first;
}

function renderNav(active: Lesson): string {
  const items = lessons
    .map(
      (lesson) => `
        <li>
          <a href="#${lesson.id}"${lesson.id === active.id ? ' aria-current="page"' : ""}>
            ${lesson.title}
          </a>
        </li>`,
    )
    .join("");

  return `
    <nav class="lesson-nav" aria-label="Lessons">
      <div class="lesson-nav-head">
        <h1>Web fundamentals</h1>
        <p>The platform, with no framework in the way</p>
      </div>
      <h2>Lessons</h2>
      <ul>${items}</ul>
    </nav>`;
}

// The teardown returned by the lesson that is currently on screen. Calling it
// before mounting the next one is the entire lifecycle of this app, and
// forgetting to call it is the leak.
let teardown: (() => void) | null = null;

function render(): void {
  teardown?.();
  teardown = null;

  const active = currentLesson();

  app.innerHTML = `
    <div class="lesson-layout">
      ${renderNav(active)}
      <main class="lesson-main">
        <header class="lesson-head">
          <h2>${active.title}</h2>
          <p>${active.summary}</p>
          <code>${active.file}</code>
        </header>
        <div class="lesson-demo" id="demo"></div>
      </main>
    </div>`;

  const demo = must<HTMLDivElement>(app, "#demo");

  try {
    teardown = active.mount(demo);
  } catch (error) {
    // No error boundary here. This is the hand-rolled version of one.
    demo.innerHTML = `<p class="lesson-error" role="alert">This lesson threw: ${String(error)}</p>`;
  }
}

window.addEventListener("hashchange", render);
render();
