# Web fundamentals 🟢

The browser platform React sits on. No React, no JSX, no framework: four lessons
written with `document.createElement` and `addEventListener`, because React is an
abstraction over this and the abstraction leaks.

Skip it if you already know what a microtask is and why a search box needs an
`AbortController`. Everything after this module assumes both.

## What the files cover

| File | What it teaches |
|---|---|
| `src/lessons/01_dom_and_events.ts` | Bubbling, and one listener on a container handling children that do not exist yet. This is what React does at the root |
| `src/lessons/02_event_loop.ts` | Sync, then microtasks, then a frame, then timers. Plus 1.5s of a blocked thread, so you can feel it |
| `src/lessons/03_fetch_and_races.ts` | The stale-response bug, and the two fixes: abort the old request, or ignore its answer |
| `src/lessons/04_storage.ts` | Cookies, `localStorage`, `sessionStorage`, IndexedDB, Cache Storage. Size, thread cost, and XSS exposure for each |
| `src/main.ts` | The sidebar, hand-rolled. Sixty lines that do badly what React does well |

`src/types.ts` holds the `Lesson` shape and `must()`, a `querySelector` that
throws instead of returning `null`.

## Run it

```bash
npm install                        # from the repo root, once
npm run dev -w web-fundamentals    # http://localhost:5173
npm test -- --project web-fundamentals
```

## Read src/main.ts

It is the only file here that is not about a browser API. It picks a lesson from
the URL hash, tears the previous one down, and rebuilds the panel.

Then notice what it does not do. It has no diff, so the whole panel is destroyed
and recreated on every navigation, and any focus or scroll position inside it is
gone. Nothing batches its DOM writes. Nothing guarantees a teardown ran, so one
missed call leaks listeners for the rest of the session. There is no error
boundary, only a `try/catch` that happens to be in the right place.

Those four problems are most of React's reason to exist. They are much easier to
care about after you have written them.

## The lesson shape

Each lesson exports a `mount(root)` that fills an element and returns its own
teardown:

```ts
export function mountDelegation(root: HTMLElement): () => void {
  const onClick = () => { /* … */ };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
```

That is the smallest honest version of a component: something that puts nodes in
the document and knows how to take them out again. `useEffect`'s cleanup
function is the same contract, and the reason it exists is the leak you get from
skipping the second half.

## One dependency, for the CSS only

`package.json` depends on `@lab/lesson-shell`, and `main.ts` imports nothing from
it but `styles.css`. Reusing the stylesheet keeps this module looking like the
rest of the repo without copying 200 lines of CSS. No React reaches the bundle:
the build output is around 8.5KB of JavaScript.

## Not covered yet

The rendering pipeline (style, layout, paint, composite, and which CSS
properties skip which stage), ES modules and tree shaking, and the accessibility
tree. They are on the list.
