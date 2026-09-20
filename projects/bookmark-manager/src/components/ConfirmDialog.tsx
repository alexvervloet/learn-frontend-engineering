import { useEffect, useId, useRef } from "react";

import { Button } from "./Ui";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A modal dialog that traps focus in both directions and gives it back.
 *
 * `<dialog showModal>` does all of this natively and also makes the rest of
 * the page inert, and is what an app should use. This is hand-rolled because
 * the accessibility module builds it that way and a capstone should show the
 * whole contract: move focus in, trap it, restore it, close on Escape.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      if (event.key !== "Tab" || panel === null) return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (first === undefined || last === undefined) return;

      // Both directions. A trap that only wraps forwards lets Shift-Tab out
      // into a page the user cannot see.
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
      // Back where it came from, or the next Tab starts at the top of the page.
      previouslyFocused?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="confirm-dialog"
        className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{body}</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button tone="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
