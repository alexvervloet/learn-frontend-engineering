/**
 * Which test, and where
 * =====================
 * Four tools in this repo, and the useful question is not "which is best" but
 * "what can this one prove that the cheaper one cannot".
 *
 *   Vitest + jsdom     logic and behaviour. Milliseconds. No layout, no paint,
 *                      no real cascade, no browser APIs beyond what jsdom
 *                      reimplements
 *   Storybook stories  one component in one state, browsable and testable.
 *                      `composeStories` runs them in Vitest, so a documented
 *                      state is a tested state
 *   Playwright         a real browser. Layout, computed styles, focus rings,
 *                      `prefers-color-scheme`, several tabs, real navigation.
 *                      Seconds, not milliseconds
 *   Type tests         claims about types, checked by tsc. See the
 *                      typescript-react module
 *
 * **jsdom's ceiling is the thing to internalise.** It parses CSS and does not
 * apply it in any layout sense. It has no viewport. It implements neither
 * `@container` nor `@layer` nor `prefers-color-scheme`, and it is missing
 * `ResizeObserver`, `IntersectionObserver`, `matchMedia` and `scrollTo`
 * entirely, which is why this repo stubs all four. Every one of those stubs is
 * a thing your test cannot check.
 *
 * So the styling module's tests could assert that its stylesheet *declares* a
 * container query, and not that the layout *changes*. This module's `e2e/`
 * folder finishes the job: it points Playwright at the styling module's dev
 * server and asserts the computed `flex-direction` at two container widths,
 * that the weakest selector really does win, and that an explicit light theme
 * beats a dark OS. A suite that says "you would have to check this in a
 * browser" and then never does is not much better than no suite.
 *
 * **The pyramid is about cost, not virtue.** Write the cheapest test that can
 * fail for the right reason. Most of a frontend's logic is reachable in jsdom
 * in a millisecond; reach for a browser when the browser is the thing under
 * test. An end-to-end suite that duplicates unit coverage is slow, flaky and
 * gets ignored.
 *
 * **What to put end to end.** The two or three journeys that must not break:
 * sign in, search and buy, the thing the business is for. Plus anything that
 * only exists in a browser. Not every field's validation message.
 *
 * `npm run e2e` from this folder starts the styling dev server, runs the
 * browser suite, and stops it again. `npm run e2e:install` fetches Chromium
 * the first time.
 */

const LAYERS = [
  {
    tool: "Vitest + Testing Library",
    proves: "behaviour and logic, from the user's point of view",
    cannot: "anything needing layout, paint or a real cascade",
    cost: "milliseconds",
  },
  {
    tool: "Storybook stories",
    proves: "a component in one state, documented and asserted together",
    cannot: "how the state was reached in a real app",
    cost: "milliseconds, via composeStories",
  },
  {
    tool: "Playwright",
    proves: "computed styles, focus rings, OS preferences, real navigation",
    cannot: "anything cheaply. It is the slow one",
    cost: "seconds",
  },
  {
    tool: "tsc, via Vitest typecheck",
    proves: "the types still say what you meant",
    cannot: "anything about runtime",
    cost: "seconds, once",
  },
];

export function Layers() {
  return (
    <div className="stack">
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            {["Tool", "Proves", "Cannot", "Cost"].map((heading) => (
              <th
                key={heading}
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  padding: "0.4rem",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LAYERS.map((layer) => (
            <tr key={layer.tool}>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid var(--border)" }}>
                <strong>{layer.tool}</strong>
              </td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid var(--border)" }}>
                {layer.proves}
              </td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid var(--border)" }}>
                {layer.cannot}
              </td>
              <td style={{ padding: "0.4rem", borderBottom: "1px solid var(--border)" }}>
                {layer.cost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="note">
        The <code>e2e/</code> folder in this module points at the styling module and checks the
        three things its own tests admitted they could not: container queries, cascade layers, and
        an explicit theme choice beating the OS.
      </p>
    </div>
  );
}
