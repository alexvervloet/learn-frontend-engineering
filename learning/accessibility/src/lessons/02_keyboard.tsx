/**
 * Keyboard order
 * ==============
 * Tab order is DOM order. That is the whole rule, and almost every keyboard
 * problem is a consequence of it.
 *
 * **`tabIndex` has three meanings and only two are safe.**
 *
 *   tabIndex={0}    focusable, in DOM order. Correct for a custom control
 *   tabIndex={-1}   focusable by script, skipped by Tab. Correct for a thing
 *                   you want to move focus *to*, like a dialog or a heading
 *   tabIndex={1+}   jumps the queue, globally. Never. One positive tabindex
 *                   reorders the whole page around it, and the next person to
 *                   add a field puts it in the wrong place by accident
 *
 * **CSS can reorder the page and cannot reorder Tab.** `flex-direction:
 * row-reverse`, `order`, and `grid-area` all move things visually while Tab
 * keeps following the DOM. The result is focus jumping backwards across the
 * screen. If the visual order matters, change the DOM.
 *
 * **A skip link is not decoration.** A keyboard user landing on a page with
 * thirty navigation links presses Tab thirty times before reaching the
 * content, on every page. One link at the very top, visible on focus, fixes
 * it. It is the single highest-value thing on this page.
 *
 * **A group of related controls should be one tab stop, not twenty.** Tabs, a
 * toolbar, a radio group, a menu: Tab moves *past* the group, and the arrow
 * keys move *within* it. That is the roving tabindex pattern: exactly one item
 * has `tabIndex={0}` at a time and the rest have `-1`, and the arrow keys move
 * both the tabindex and the focus. Without it, a toolbar of twenty buttons is
 * twenty presses to get past.
 *
 * **Never remove the outline without replacing it.** `:focus { outline: none }`
 * is the most damaging line of CSS in common use. `:focus-visible` is the
 * modern answer: the ring shows for keyboard users and not on a mouse click,
 * which is what people actually wanted when they removed it.
 */
import { useRef, useState } from "react";

const TOOLS = ["Bold", "Italic", "Underline", "Strike"] as const;

/** Roving tabindex: one stop for the whole toolbar, arrows move inside it. */
export function Toolbar() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(delta: number): void {
    const next = (active + delta + TOOLS.length) % TOOLS.length;
    setActive(next);
    // Moving the tabindex is not enough; focus has to follow.
    refs.current[next]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          setActive(0);
          refs.current[0]?.focus();
        } else if (event.key === "End") {
          event.preventDefault();
          const last = TOOLS.length - 1;
          setActive(last);
          refs.current[last]?.focus();
        }
      }}
      className="row"
    >
      {TOOLS.map((tool, index) => (
        <button
          key={tool}
          ref={(node) => {
            refs.current[index] = node;
          }}
          // Exactly one 0 at a time. This is the whole pattern.
          tabIndex={index === active ? 0 : -1}
          onClick={() => setActive(index)}
        >
          {tool}
        </button>
      ))}
    </div>
  );
}

/** Every button its own tab stop. Four here; imagine twenty. */
export function NaiveToolbar() {
  return (
    <div className="row" aria-label="Formatting, the slow way" role="group">
      {TOOLS.map((tool) => (
        <button key={tool} data-testid={`naive-${tool}`}>
          {tool}
        </button>
      ))}
    </div>
  );
}

export function SkipLink() {
  return (
    <a
      href="#lesson-main"
      data-testid="skip-link"
      // Visible when focused, out of the way otherwise. Not display:none,
      // which would make it unfocusable and therefore pointless.
      style={{
        position: "absolute",
        left: "-9999px",
        background: "var(--surface)",
        padding: "0.5rem",
        borderRadius: "7px",
      }}
      onFocus={(event) => {
        event.currentTarget.style.left = "0.5rem";
      }}
      onBlur={(event) => {
        event.currentTarget.style.left = "-9999px";
      }}
    >
      Skip to the content
    </a>
  );
}

export function Keyboard() {
  return (
    <div className="stack">
      <SkipLink />

      <h3>One tab stop, arrows inside</h3>
      <Toolbar />

      <h3>Four tab stops for four buttons</h3>
      <NaiveToolbar />

      <div id="lesson-main" tabIndex={-1}>
        <h3>The content the skip link jumps to</h3>
        <p>
          <code>tabIndex={-1}</code> here so focus can be moved to it by script, without adding a
          tab stop for everyone else.
        </p>
      </div>

      <p className="note">
        Tab into the first toolbar: one stop, and then Left and Right move between the buttons. Tab
        into the second: four stops. Press Tab from the very top of the page to see the skip link
        appear.
      </p>
    </div>
  );
}
