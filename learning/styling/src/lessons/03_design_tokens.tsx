/**
 * Design tokens and dark mode
 * ===========================
 * A token is a named decision. The useful version has two tiers:
 *
 *   --color-brand-500: oklch(…)     primitive. A value with a name
 *   --surface: var(--color-brand-50)  semantic. A role, pointing at a primitive
 *
 * Components reference roles, never values. `background: var(--surface)` keeps
 * working when the palette changes; `background: var(--color-brand-50)` is a
 * decision that has to be found and changed everywhere. The whole return on
 * tokens comes from that indirection, and a single-tier system that names
 * colours after what they look like gives you `--light-grey` being dark in dark
 * mode.
 *
 * **Theming is then `light-dark()`.** `src/tokens.css` declares each role once
 * with both of its values, and the browser picks according to the element's
 * `color-scheme`. No component knows a theme exists, and no token can be
 * given a light value without a dark one, because the function takes two
 * arguments.
 *
 *   --surface: light-dark(oklch(1 0 0), oklch(0.21 0.015 265));
 *
 * **Three states, not two.** "Dark" and "light" are not enough, because the
 * honest default is "whatever the OS says". Each one is a `color-scheme`:
 *
 *   system   no attribute. `color-scheme: light dark`, and the OS decides
 *   light    data-theme="light" pins `color-scheme: light`
 *   dark     data-theme="dark"  pins `color-scheme: dark`
 *
 * **The bug this used to need a selector for.** Before `light-dark()`, the
 * dark values lived in `@media (prefers-color-scheme: dark)` and had to be
 * written `:root:not([data-theme="light"])`. Without that `:not()`, a user on
 * a dark OS who picked light got dark anyway: equal specificity, later in the
 * file, media query wins. It read as "the light button does nothing".
 *
 * There is no media query now, so there is nothing to guard. Worth
 * remembering anyway, because you will meet the old shape in existing
 * codebases and the symptom is not obviously a specificity problem.
 *
 * **Writing to `<html>` rather than a wrapper div** means the background behind
 * an overscroll bounce is right, and `color-scheme` is what makes native
 * scrollbars, form controls and the overscroll flash follow the theme. It is
 * now doing two jobs: that one, and telling `light-dark()` which value to
 * take. A React context holding a theme string that only styles a `<div>`
 * leaves the edges of the page wrong.
 *
 * **Tailwind's `dark:` variant is the other approach.** `bg-white dark:bg-black`
 * puts the decision at every use site. It is fine for a small app and it does
 * not scale: every component then knows about both themes, and a third theme
 * means touching all of them. Tokens keep it in one file. The two combine
 * happily, with `dark:` for one-off corrections.
 */
import { useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";

/** Writing the attribute is the whole theme switch. Exported so the test can call it directly. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;

  if (choice === "system") {
    // Remove it rather than setting "system": the CSS keys off the attribute
    // being absent, and `data-theme="system"` matches neither rule.
    delete root.dataset["theme"];
    root.style.colorScheme = "light dark";
    return;
  }

  root.dataset["theme"] = choice;
  // Tells the browser to use native dark scrollbars, form controls and
  // caret colours. CSS custom properties cannot do this.
  root.style.colorScheme = choice;
}

const ROLES = [
  "--surface",
  "--surface-sunken",
  "--text-strong",
  "--text-muted",
  "--border-subtle",
  "--accent-fg",
  "--accent-bg",
] as const;

export function DesignTokens() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    applyTheme(choice);
  }, [choice]);

  return (
    <div className="stack">
      <div className="row" role="group" aria-label="Theme">
        {(["system", "light", "dark"] as const).map((option) => (
          <button
            key={option}
            onClick={() => setChoice(option)}
            aria-pressed={choice === option}
            disabled={choice === option}
          >
            {option}
          </button>
        ))}
      </div>

      <div
        data-testid="preview"
        style={{
          background: "var(--surface)",
          color: "var(--text-strong)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "0.625rem",
          padding: "var(--spacing-gutter)",
        }}
      >
        <p style={{ marginTop: 0 }}>
          Every colour here is a role.{" "}
          <span style={{ color: "var(--text-muted)" }}>Muted text</span>, and{" "}
          <span
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-fg)",
              padding: "0.1rem 0.4rem",
              borderRadius: "5px",
            }}
          >
            an accent
          </span>
          .
        </p>

        <ul data-testid="roles" style={{ margin: 0, paddingInlineStart: "1.1rem" }}>
          {ROLES.map((role) => (
            <li key={role}>
              <code>{role}</code>
            </li>
          ))}
        </ul>
      </div>

      <p className="note">
        Set your OS to dark, then press “light” here. It goes light and stays light, because the
        button pins <code>color-scheme</code> and every token reads it. Each role above is declared
        once in <code>src/tokens.css</code>, with both values, so there is no second list that can
        drift out of step with the first.
      </p>
    </div>
  );
}
