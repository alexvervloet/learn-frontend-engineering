/**
 * Finding things the way a user would
 * ===================================
 * Testing Library's queries are ranked, and the ranking is an accessibility
 * argument disguised as an API:
 *
 *   getByRole          how assistive tech finds it. Almost always the answer
 *   getByLabelText     form fields, by their visible label
 *   getByPlaceholderText  only when there is genuinely no label (there usually is)
 *   getByText          non-interactive content
 *   getByTestId        the escape hatch. Nothing else could work
 *
 * The reason to start at the top is not purity. **A component a test cannot
 * find by role is a component a screen reader cannot announce.** The query
 * failing is the bug. Reaching for `getByTestId` to get past it hides an
 * accessibility problem behind a passing test.
 *
 * The demo renders the same panel twice: once with real elements, once as divs
 * with click handlers, which is what a component library built without
 * semantics looks like. The second one looks identical and is unreachable by
 * role, by label and by keyboard.
 *
 * **`name` is the accessible name**, not the `name` attribute. It comes from
 * the visible text, `aria-label`, or an associated `<label>`. That is why
 * `getByRole("button", { name: "Sign in" })` is a strong assertion: it fails if
 * the button stops being a button *or* stops being announced correctly.
 *
 * **`user-event` over `fireEvent`.** `fireEvent.click` dispatches one event.
 * `userEvent.click` does what a real click does: pointer events, focus, then
 * click, and it refuses to click something `disabled` or covered. Tests written
 * with `fireEvent` pass against components that a real user cannot operate.
 *
 * **Test ids are not forbidden.** They are right for something with no
 * accessible identity at all: a chart container, a layout wrapper you are
 * asserting about, a render counter like the ones in this repo. Use one when
 * you have decided to, not to get unstuck.
 */
import { useState } from "react";

export function SemanticPanel({ onSignIn }: { onSignIn: (email: string) => void }) {
  const [email, setEmail] = useState("");

  return (
    <section aria-labelledby="semantic-heading">
      <h3 id="semantic-heading">Sign in</h3>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSignIn(email);
        }}
      >
        <label htmlFor="semantic-email">Email</label>
        <input
          id="semantic-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" disabled={email === ""}>
          Sign in
        </button>
      </form>
    </section>
  );
}

/**
 * The same thing, built from divs. It looks identical, it is unreachable by
 * role, it cannot be focused or activated from a keyboard, and the "label" is
 * text that happens to sit next to an input.
 */
export function DivSoupPanel({ onSignIn }: { onSignIn: (email: string) => void }) {
  const [email, setEmail] = useState("");

  return (
    <div data-testid="soup-panel">
      <div style={{ fontWeight: 700 }}>Sign in</div>
      <div>Email</div>
      <div
        contentEditable
        data-testid="soup-email"
        onInput={(event) => setEmail(event.currentTarget.textContent ?? "")}
        style={{ border: "1px solid var(--border)", padding: "0.35rem", borderRadius: "7px" }}
      />
      {/* Both rules below are correct, and firing on them is the lesson. A
          div with an onClick is not a button: no keyboard, no role, no
          announcement. They are off for this one element so the broken version
          can sit next to the working one. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        data-testid="soup-submit"
        onClick={() => onSignIn(email)}
        style={{ cursor: "pointer", color: "var(--accent)" }}
      >
        Sign in
      </div>
    </div>
  );
}

export function Queries() {
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <SemanticPanel onSignIn={setLastSignIn} />
        <DivSoupPanel onSignIn={setLastSignIn} />
      </div>

      <p data-testid="last">
        {lastSignIn === null ? "nobody signed in" : `signed in: ${lastSignIn}`}
      </p>

      <p className="note">
        Try to reach the right-hand panel with Tab. You cannot. Its test would have to use test ids,
        and it would pass.
      </p>
    </div>
  );
}
