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
 * 2. Adding a listener creates a reference that outlives the element unless you
 *    remove it. In a framework you rarely see this because the framework
 *    unsubscribes for you. `useEffect`'s cleanup function is this, by hand.
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

  list.addEventListener("click", onListClick);
  addButton.addEventListener("click", addRow);

  addRow();
  addRow();

  // The teardown. Without it, this lesson's listeners stay attached to detached
  // nodes for as long as something holds a reference to them.
  return () => {
    list.removeEventListener("click", onListClick);
    addButton.removeEventListener("click", addRow);
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
