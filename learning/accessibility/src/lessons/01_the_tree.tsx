/**
 * The accessibility tree
 * ======================
 * A browser builds a second tree alongside the DOM, and that is what a screen
 * reader reads. Every node in it has, at most, three things:
 *
 *   role    what kind of thing it is: button, link, heading, textbox, dialog
 *   name    what it is called: the text, the label, the aria-label
 *   state   checked, expanded, disabled, selected, invalid, busy
 *
 * A `<div onClick>` has no role, no name and no state. It is not in the tree as
 * anything; it is a generic container with text inside. Visually identical,
 * completely absent.
 *
 * **The first rule of ARIA is not to use ARIA.** A `<button>` gives you the
 * role, the name from its text, keyboard activation with Enter and Space, focus,
 * and the disabled state, for free and correctly. Rebuilding that on a div takes
 * `role="button"`, `tabIndex={0}`, an `onKeyDown` handling both keys,
 * `aria-disabled`, and a way to stop the click firing when disabled. People get
 * one of those wrong roughly always.
 *
 * **Where the name comes from**, in priority order:
 *
 *   aria-labelledby   the text of the elements it points at. Wins over everything
 *   aria-label        a string. Overrides the visible text, which is a trap
 *   the element's own content   what you usually want
 *   a <label> for a form control
 *   title             a last resort, and not announced by every screen reader
 *
 * `aria-label` overriding visible text is the most common way to break voice
 * control: someone says "click Save", the button is labelled "Save changes to
 * document", and nothing happens. If there is visible text, let it be the name.
 *
 * **State has to be real.** `aria-expanded` that never changes is worse than
 * none: it tells the user the panel is closed while they are looking at it
 * open. The demo has a toggle that reports its state and one that does not.
 *
 * Every assertion in the test file is a query by role and name, which means the
 * test is reading the same tree the screen reader is.
 */
import { useId, useState } from "react";

export function AccessibleDisclosure() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        // Real state, kept in step with the real thing.
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        Shipping details
      </button>
      {open && (
        <div id={panelId} data-testid="accessible-panel">
          <p>Delivered in 2 to 3 days.</p>
        </div>
      )}
    </div>
  );
}

/** The same thing, as a div. Looks identical, announces nothing. */
export function InaccessibleDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-testid="soup-toggle"
        onClick={() => setOpen((current) => !current)}
        style={{ color: "var(--accent)", cursor: "pointer" }}
      >
        Shipping details
      </div>
      {open && (
        <div data-testid="soup-panel">
          <p>Delivered in 2 to 3 days.</p>
        </div>
      )}
    </div>
  );
}

/** An icon button: no visible text, so it needs a name of its own. */
export function IconButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} aria-label="Close">
      ✕
    </button>
  );
}

/**
 * The trap: visible text says "Save", the accessible name says something else.
 * Voice control users say what they can see, and nothing happens.
 */
export function MislabelledButton() {
  return (
    <button aria-label="Save changes to the current document" data-testid="mislabelled">
      Save
    </button>
  );
}

export function TheTree() {
  return (
    <div className="stack">
      <h3>The same disclosure, twice</h3>
      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <section>
          <h4>As a button</h4>
          <AccessibleDisclosure />
        </section>
        <section>
          <h4>As a div</h4>
          <InaccessibleDisclosure />
        </section>
      </div>

      <h3>Where the name comes from</h3>
      <div className="row">
        <IconButton onClose={() => undefined} />
        <MislabelledButton />
      </div>

      <p className="note">
        Turn on VoiceOver and Tab through this. The left disclosure says &ldquo;Shipping details,
        button, collapsed&rdquo; and then &ldquo;expanded&rdquo;. The right one is not reachable at
        all. The second button reads as &ldquo;Save changes to the current document&rdquo;, so a
        voice-control user saying &ldquo;click Save&rdquo; gets nothing.
      </p>
    </div>
  );
}
