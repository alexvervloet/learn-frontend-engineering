/**
 * axe, and what it cannot see
 * ===========================
 * axe-core checks a rendered tree against a set of rules and reports
 * violations with the rule, the impact and the offending element. It is fast,
 * it has almost no false positives, and it belongs in CI.
 *
 * It also finds, by Deque's own estimate, something like **a third of
 * accessibility problems**. That number is the most useful thing to know about
 * it, because a green axe run is routinely mistaken for an accessible page.
 *
 * **What it catches**, reliably and worth automating:
 *
 *   an image with no alt              a form field with no label
 *   a button with no accessible name  a heading level skipped
 *   insufficient colour contrast      duplicate ids, invalid ARIA
 *   a positive tabindex               a missing document language
 *
 * **What it cannot catch**, and these are the ones that make a page unusable:
 *
 *   alt text that is present and wrong   "image123.png"
 *   a label that is present and wrong    the mislabelled Save in lesson 01
 *   a tab order that is valid and absurd   CSS reordered the page
 *   focus that goes nowhere after an action
 *   a live region nobody registered      lesson 04
 *   a keyboard trap you cannot escape
 *   a custom widget with the wrong role but no rule violated
 *
 * Every one of those passes axe. Most of them are caught by the tests in the
 * other lessons of this module, which is the argument for writing them: axe is
 * the floor, not the ceiling.
 *
 * **Run it in three places.** Against a component in Vitest, which is what the
 * test beside this file does. Against a story, which the Storybook a11y addon
 * does for free. And against a real page in Playwright with
 * `@axe-core/playwright`, which is the only one that can evaluate colour
 * contrast, because contrast needs rendering and jsdom paints nothing. That is
 * why `src/axe.ts` disables the contrast rule here rather than letting it
 * report a false pass.
 *
 * **Fail the build on it.** A report nobody reads is a report. An assertion is
 * a rule.
 */

/** Four violations, on purpose. The test names each one. */
export function BrokenPanel() {
  return (
    <div data-testid="broken">
      {/* No alt: a screen reader reads the file name, or nothing. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img src="/chart.png" width={64} height={64} />

      {/* An input with no label of any kind. */}
      <input type="text" />

      {/* A button whose only content is an icon, with no accessible name. */}
      <button>
        <span aria-hidden="true">✕</span>
      </button>

      {/* A positive tabindex, which reorders the whole page around it. */}
      {/* eslint-disable-next-line jsx-a11y/tabindex-no-positive */}
      <a href="#somewhere" tabIndex={3}>
        Jumps the queue
      </a>
    </div>
  );
}

/** The same panel, fixed. axe reports nothing. */
export function FixedPanel() {
  return (
    <div data-testid="fixed">
      <img src="/chart.png" width={64} height={64} alt="Revenue by month, rising from March" />

      <label>
        Search
        <input type="text" />
      </label>

      <button aria-label="Close">
        <span aria-hidden="true">✕</span>
      </button>

      <a href="#somewhere">Waits its turn</a>
    </div>
  );
}

/**
 * Passes axe and is still bad. Nothing here violates an axe rule: the image
 * has alt text, the button has a name, the field has a label. They are simply
 * wrong.
 *
 * One of the three is caught by something else, and it is worth knowing which.
 * `jsx-a11y/img-redundant-alt` flags `alt="image"` statically, from the
 * source, without rendering anything. That is a rule axe does not have and
 * cannot easily have: at runtime, `alt="image"` is indistinguishable from any
 * other short string. The lint rule is disabled on that line below so the
 * example can exist.
 *
 * The lesson is not "automation cannot help". It is that the tools see
 * different things: a linter reads your source, axe reads a rendered tree, and
 * a role-and-name query reads what a user would be told. The mislabelled
 * button and the Name-labelled email field below are caught by none of the
 * first two.
 */
export function PassesAxeStillBad() {
  return (
    <div data-testid="subtle">
      {/* Present, and useless. Caught by jsx-a11y, not by axe. */}
      {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
      <img src="/chart.png" width={64} height={64} alt="image" />

      {/* A name that is not what the button says. Voice control cannot use it. */}
      <button aria-label="Submit the form and continue to payment">Next</button>

      {/* Labelled "Name", collects an email. */}
      <label>
        Name
        <input type="email" />
      </label>
    </div>
  );
}

export function Axe() {
  return (
    <div className="stack">
      <h3>Four violations</h3>
      <BrokenPanel />

      <h3>The same thing, fixed</h3>
      <FixedPanel />

      <h3>Passes axe, still unusable</h3>
      <PassesAxeStillBad />

      <p className="note">
        The third panel has no violations. The alt text is &ldquo;image&rdquo;, the button is
        announced as something other than what it says, and the email field is labelled Name. axe is
        the floor.
      </p>
    </div>
  );
}
