/**
 * Focus management
 * ================
 * Focus is where the keyboard is and where the screen reader is reading. When
 * the page changes and focus does not, a sighted mouse user notices nothing
 * and everyone else is lost. Four moments matter.
 *
 * **Opening a dialog.** Move focus into it, trap it there, and put it back
 * where it came from on close. Without the trap, Tab walks out of the dialog
 * and into the page behind, which is still there, still focusable, and now
 * invisible behind an overlay. Without the restore, focus falls back to
 * `document.body` and the next Tab starts at the top of the page.
 *
 * `<dialog showModal>` does all three natively and also makes everything
 * behind it inert. Use it. The hand-rolled version below exists because
 * plenty of codebases have one and it is worth knowing what it must do.
 *
 * **Deleting the thing that had focus.** Remove a row and focus goes to
 * `body`. Move it to the next row, or to the list, or to whatever the user
 * would logically do next. The demo moves it to the next row and falls back to
 * the Add button when the list empties.
 *
 * **Navigating in a single-page app.** The browser moves focus to the top of
 * the document on a real navigation; a client-side router does not. Nothing is
 * announced, and Tab resumes from wherever the old link was. Move focus to the
 * new page's `<h1>` with `tabIndex={-1}`.
 *
 * **Expanding something.** Focus usually stays put and the new content is
 * described by `aria-controls` and `aria-expanded`. Moving focus into a panel
 * the user did not ask to enter is its own bug.
 *
 * **The rule for the trap**: Tab from the last focusable element goes to the
 * first, and Shift-Tab from the first goes to the last. Escape closes. Both
 * directions, or it is a one-way trap that is worse than none.
 *
 * **And the edge that rule forgets is the panel itself.** The panel has
 * `tabindex="-1"` so it can be focused on open, which also keeps it out of any
 * list of focusable children. So right after opening, focus is on an element
 * that is neither the first nor the last of them, and a trap that only
 * compares against those two lets Shift-Tab straight back out to the opener.
 * This file got that wrong until a test stopped tabbing forward first.
 */
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  /**
   * `onClose` is a new arrow on every render of whatever owns this dialog, so
   * listing it as a dependency re-runs the effect on every one of those
   * renders: the cleanup hands focus back to the opener and the next run drags
   * it into the panel, taking it from the control the user had tabbed to.
   *
   * `useEffectEvent` is the fix React shipped for exactly this. It gives the
   * effect a stable function that always sees the latest `onClose`, so the
   * dependency list can say what it means, which is "when the dialog opens".
   * react-core lesson 12 is about the general shape of this.
   */
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;

    // Remember where we came from, so it can be given back.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || panel === null) return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;

      const active = document.activeElement;

      // The panel counts as a backward edge as well as `first`, and leaving it
      // out is how this trap leaked.
      //
      // The panel is focusable by script and deliberately absent from
      // `focusable`, because its tabindex is -1. So at the one moment that
      // matters most, immediately after opening, focus is on the panel and is
      // neither `first` nor `last`. A check written against only those two
      // falls through to the browser, and Shift-Tab walks to whatever precedes
      // the dialog in the DOM: the button that opened it, behind the overlay.
      //
      // A test that tabs forward before it shift-tabs never sees this. Test
      // the trap from the state the user is actually in when it opens.
      const leavingBackwards = event.shiftKey && (active === first || active === panel);
      const leavingForwards = !event.shiftKey && active === last;

      if (leavingBackwards) {
        event.preventDefault();
        last.focus();
      } else if (leavingForwards) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Back where it came from. Without this the next Tab starts at the top
      // of the page.
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // Focusable by script, not by Tab.
      tabIndex={-1}
      data-testid="dialog"
      style={{
        border: "2px solid var(--accent)",
        borderRadius: "var(--radius)",
        padding: "1rem",
        background: "var(--surface)",
      }}
    >
      <h4 id={titleId} style={{ marginTop: 0 }}>
        {title}
      </h4>
      {children}
      <div className="row">
        <button onClick={onClose}>Cancel</button>
        <button onClick={onClose}>Confirm</button>
      </div>
    </div>
  );
}

export function RemovableList() {
  const [items, setItems] = useState(["First", "Second", "Third"]);
  const addRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  function remove(index: number): void {
    const next = items.filter((_, position) => position !== index);
    setItems(next);

    // Where should focus go? Not body, which is where it goes if you do
    // nothing. The next row, or the Add button if there is no next row.
    queueMicrotask(() => {
      if (next.length === 0) {
        addRef.current?.focus();
        return;
      }
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [];
      const target = buttons[Math.min(index, buttons.length - 1)];
      target?.focus();
    });
  }

  return (
    <div className="stack">
      <ul ref={listRef} data-testid="items">
        {items.map((item, index) => (
          <li key={item} className="row">
            {item}
            <button onClick={() => remove(index)} aria-label={`Remove ${item}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <button
        ref={addRef}
        onClick={() => setItems((current) => [...current, `Item ${current.length + 1}`])}
      >
        Add an item
      </button>
    </div>
  );
}

export function FocusManagement() {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack">
      <h3>A dialog that gives focus back</h3>
      <button onClick={() => setOpen(true)}>Open the dialog</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete everything?">
        <p>This cannot be undone.</p>
      </Dialog>

      <h3>Deleting the thing that had focus</h3>
      <RemovableList />

      <p className="note">
        Open the dialog with the keyboard, Tab around it: you cannot get out. Press Escape and focus
        is back on the button you opened it with. In the list, remove a row with the keyboard and
        focus lands on the next one rather than at the top of the page.
      </p>
    </div>
  );
}
