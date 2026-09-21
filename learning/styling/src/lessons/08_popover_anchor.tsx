/**
 * The Popover API and CSS anchor positioning
 * ==========================================
 * Two platform features that between them delete the reason most codebases
 * carry Floating UI, Popper or a hand-rolled dropdown.
 *
 * **`popover` puts an element in the top layer.** Above everything in the
 * document, regardless of `z-index` and regardless of which ancestor has
 * `overflow: hidden`. That one behaviour is most of what those libraries were
 * for: the old answer was a portal to `document.body` plus a z-index arms race
 * with whatever the design system had already claimed.
 *
 * **`popovertarget` opens it with no JavaScript at all.**
 *
 *   <button popovertarget="tip">Why?</button>
 *   <div id="tip" popover>Because.</div>
 *
 * That is the whole thing. The button gets the right ARIA wiring from the
 * platform, Escape closes it, clicking outside closes it, focus moves into it
 * and comes back to the button afterwards. Every one of those is a bug people
 * ship in a hand-rolled version, and the accessibility module has a lesson
 * about two of them.
 *
 * **`popover="auto"` versus `popover="manual"`.** `auto` is light-dismiss:
 * Escape and an outside click close it, and opening a second `auto` popover
 * closes the first, because they live in one stack. `manual` does none of
 * that and only closes when you tell it to. Use `auto` for menus and tooltips,
 * `manual` for something like a toast that must not vanish because the user
 * clicked elsewhere.
 *
 * **Anchor positioning replaces the measuring loop.**
 *
 *   .trigger  { anchor-name: --tip-anchor; }
 *   .popover  { position-anchor: --tip-anchor; position-area: block-end; }
 *
 * No `getBoundingClientRect`, no scroll listener, no `requestAnimationFrame`.
 * The browser keeps them together as the page scrolls and reflows.
 * `position-try-fallbacks: flip-block` is the "no room below, go above"
 * behaviour, which is the flip middleware of every popover library and about
 * forty lines of arithmetic by hand.
 *
 * **Where the line is.** A popover is not a dialog. `<dialog>` with
 * `showModal()` is the one that traps focus and makes the rest of the page
 * inert, and that is what a confirm-or-cancel needs. Popover is for things the
 * user can walk away from. The accessibility module's lesson 03 builds the
 * dialog case.
 *
 * `anchor-name` is newer than `popover` and a browser can have one without the
 * other, so `popover.css` carries a `@supports not (anchor-name: --probe)`
 * fallback. Feature-detect the positioning, not the popover.
 *
 * **Writing that fallback is harder than it looks**, because `[popover]` comes
 * with UA styles: `inset: 0` and `margin: auto`, which is what centres an
 * unpositioned one. Override two edges and the other two stay pinned at 0 with
 * auto margins still resolving against them, so the popover lands somewhere
 * unrelated to either value you set. The block starts with `inset: auto` and
 * `margin: 0` for that reason, and it did not until a test applied its
 * declarations and measured the result.
 */
import { useRef, useState } from "react";

/**
 * Feature detection, split in two because the two features ship separately.
 *
 * `HTMLElement.prototype.hasOwnProperty("popover")` rather than checking for
 * `showPopover`: the property reflects the attribute and is the thing the
 * declarative `popovertarget` path needs. A browser with the method and not
 * the property does not exist, but the property is what the markup uses.
 */
export function supportsPopover(): boolean {
  return Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover");
}

export function supportsAnchorPositioning(): boolean {
  // `CSS.supports` is the only honest way to ask. Note that jsdom answers
  // `true` to almost any syntactically valid declaration, so this returns a
  // false positive under test and the suite says so rather than asserting it.
  return typeof CSS !== "undefined" && CSS.supports("anchor-name", "--probe");
}

export type PopoverKind = "auto" | "manual";

/**
 * What each kind closes on. Exported as data so the claims in the prose above
 * are assertions rather than a paragraph.
 */
export const DISMISS_BEHAVIOUR: Record<
  PopoverKind,
  { escape: boolean; outsideClick: boolean; closesOtherPopovers: boolean }
> = {
  auto: { escape: true, outsideClick: true, closesOtherPopovers: true },
  manual: { escape: false, outsideClick: false, closesOtherPopovers: false },
};

export function PopoverAndAnchor() {
  const manualRef = useRef<HTMLDivElement>(null);
  const [manualOpen, setManualOpen] = useState(false);

  /*
   * A lazy initialiser, not an effect.
   *
   * The first version set this in a `useEffect`, which earns
   * react-hooks/set-state-in-effect and deserves it: the answer never
   * changes, so there is nothing to synchronise and the extra render buys
   * nothing. `useState(fn)` runs `fn` once, on the first render.
   *
   * This module is a client-only Vite app, so reading `HTMLElement` during
   * render is safe. Under server rendering it would not be, and the fix is
   * not an effect either: it is `useSyncExternalStore` with a server snapshot
   * saying "assume not supported", which is what `useReducedMotion` in this
   * module does and what rendering-strategies lesson 02 is about.
   */
  const [support] = useState(() => ({
    popover: supportsPopover(),
    anchor: supportsAnchorPositioning(),
  }));

  function toggleManual(): void {
    const element = manualRef.current;
    if (element === null) return;

    // `togglePopover` returns the new state, so there is no need to track it
    // separately. The React state here is only to label the button.
    const open = element.togglePopover();
    setManualOpen(open);
  }

  return (
    <div className="stack">
      <p className="note" data-testid="support">
        popover: {support.popover ? "yes" : "no"} · anchor positioning:{" "}
        {support.anchor ? "yes" : "no"}
      </p>

      <section className="stack">
        <h3>Declarative, with no JavaScript</h3>
        <p className="note">
          The button below has no <code>onClick</code>. Everything it does comes from two
          attributes, including Escape, the outside click, and returning focus.
        </p>

        {/*
          popovertarget is the whole wiring. React passes both through as
          plain attributes, so nothing here is React-specific.
        */}
        <button
          type="button"
          className="anchored-trigger"
          popoverTarget="anchored-tip"
          data-testid="open-anchored"
        >
          Why is this anchored?
        </button>

        <div
          id="anchored-tip"
          popover="auto"
          className="anchored-popover"
          data-testid="anchored-tip"
        >
          <p>
            This sits in the top layer, so no ancestor&rsquo;s <code>overflow: hidden</code> can
            clip it and no <code>z-index</code> can cover it.
          </p>
          <p className="note">
            Scroll the page with it open. It follows the button, and nothing is listening for
            scroll.
          </p>
          <button type="button" popoverTarget="anchored-tip" popoverTargetAction="hide">
            Close
          </button>
        </div>
      </section>

      <section className="stack">
        <h3>auto versus manual</h3>
        <p className="note">
          Open both. The anchored one closes when you click away or press Escape. This one does not,
          because <code>manual</code> opts out of light dismiss.
        </p>

        <button type="button" onClick={toggleManual} data-testid="toggle-manual">
          {manualOpen ? "Hide" : "Show"} the manual popover
        </button>

        <div
          ref={manualRef}
          id="manual-note"
          popover="manual"
          className="manual-popover"
          data-testid="manual-note"
        >
          <p>Still here. Click anywhere, press Escape.</p>
          <button type="button" onClick={toggleManual}>
            Dismiss
          </button>
        </div>
      </section>

      <section className="stack">
        <h3>A popover is not a dialog</h3>
        <p className="note">
          Nothing here traps focus or makes the page inert, and that is correct: a popover is for
          something the user can walk away from. A confirm-or-cancel needs{" "}
          <code>&lt;dialog&gt;</code> and <code>showModal()</code>, which the accessibility module
          builds by hand in its lesson 03.
        </p>
      </section>
    </div>
  );
}
