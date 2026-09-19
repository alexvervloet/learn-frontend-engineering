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
 */
import { useEffect, useId, useRef, useState } from "react";

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

  useEffect(() => {
    if (!open) return;

    // Remember where we came from, so it can be given back.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || panel === null) return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;

      // Both directions. A trap that only wraps forwards lets Shift-Tab out.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
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
  }, [open, onClose]);

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
