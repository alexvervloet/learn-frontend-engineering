/**
 * The DOM and event delegation
 * ============================
 * Two things every React developer ends up needing to know about the platform
 * underneath.
 *
 * 1. Events bubble. A click on a button fires on the button, then on its parent,
 *    then its parent, all the way to `document`. You can therefore listen once
 *    on a container instead of once per child. That is *event delegation*, and
 *    it is exactly what React does: it attaches one listener per event type at
 *    the root container and synthesises the rest.
 *
 * 2. A listener you do not remove outlives the thing that added it, but only
 *    sometimes, and the distinction is the one people get wrong.
 *
 *    A listener on a node inside your own markup is fine either way. When the
 *    teardown replaces that markup, the node goes with it, and an unreachable
 *    node's listeners are unreachable too. `list` and `addButton` below are
 *    this case: removing them is tidy and changes nothing.
 *
 *    A listener on a node you do not own is the leak. `document`, `window`,
 *    `document.body`, a shared scroll container, an element the framework
 *    hands you and then reuses. Those outlive your teardown by definition, so
 *    the listener stays, the closure keeps everything it captured alive, and
 *    the next mount adds another one beside it. `onKeyDown` below is this
 *    case, which is why it is here: a lesson about cleanup that only shows the
 *    harmless version teaches the wrong instinct.
 *
 *    In a framework you rarely see either, because the framework unsubscribes
 *    for you. `useEffect`'s cleanup function is this, by hand.
 *
 * The demo adds rows forever and never adds a second listener.
 */
import { must, type Lesson } from "../types";

export function mountDelegation(root: HTMLElement): () => void {
  root.innerHTML = `
    <div class="stack">
      <div class="row">
        <button id="add">Add a row</button>
        <span id="count" class="note">0 rows, 1 listener</span>
        <span class="note">Escape clears them.</span>
      </div>
      <ul id="list" class="stack"></ul>
    </div>
  `;

  const list = must<HTMLUListElement>(root, "#list");
  const addButton = must<HTMLButtonElement>(root, "#add");
  const count = must<HTMLSpanElement>(root, "#count");

  let rows = 0;

  function addRow(): void {
    rows += 1;
    const item = document.createElement("li");
    item.className = "row";
    // dataset is how you attach data to a node without a second lookup table.
    item.dataset["rowId"] = String(rows);
    item.innerHTML = `<span>Row ${rows}</span> <button data-action="remove">Remove</button>`;
    list.append(item);
    render();
  }

  function render(): void {
    count.textContent = `${list.children.length} rows, 1 listener`;
  }

  // One listener on the list, not one per Remove button. Rows added later are
  // covered automatically, because the listener is on an ancestor that already
  // exists.
  function onListClick(event: MouseEvent): void {
    // event.target is what was clicked. event.currentTarget is what the listener
    // is attached to. Mixing them up is the classic delegation bug.
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>('button[data-action="remove"]');
    if (!button) return;

    button.closest("li")?.remove();
    render();
  }

  // On `document`, not on the list, because a keyboard shortcut has to work
  // wherever focus happens to be. That is also what makes it the one listener
  // here that genuinely leaks: `document` is still there after the teardown.
  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    list.replaceChildren();
    render();
  }

  list.addEventListener("click", onListClick);
  addButton.addEventListener("click", addRow);
  document.addEventListener("keydown", onKeyDown);

  addRow();
  addRow();

  // The teardown.
  //
  // The first two lines are housekeeping: `root.innerHTML = ""` on the last
  // line already makes those nodes unreachable, so their listeners go with
  // them whether or not we ask.
  //
  // The third line is the one that matters. `document` outlives this lesson,
  // so without it every visit to this page leaves another keydown handler
  // behind, each holding its own `list`, `count` and row counter. Press
  // Escape after four visits and four detached lists get cleared.
  return () => {
    list.removeEventListener("click", onListClick);
    addButton.removeEventListener("click", addRow);
    document.removeEventListener("keydown", onKeyDown);
    root.innerHTML = "";
  };
}

export const lesson: Lesson = {
  id: "dom-and-events",
  title: "The DOM and event delegation",
  summary:
    "One listener on a container handles children that do not exist yet. React does this too.",
  file: "src/lessons/01_dom_and_events.ts",
  mount: mountDelegation,
};
