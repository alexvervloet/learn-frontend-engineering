/**
 * Tailwind 4: the config is the stylesheet
 * ========================================
 * There is no `tailwind.config.js` in this module. v4 reads its configuration
 * from CSS:
 *
 *   @theme {
 *     --color-brand-500: oklch(0.58 0.19 265);
 *     --spacing-gutter: 1.25rem;
 *   }
 *
 * Every token declared there becomes two things at once: a real CSS custom
 * property you can use anywhere, and a family of utilities. One line gives you
 * `bg-brand-500`, `text-brand-500`, `border-brand-500`, `ring-brand-500`, and
 * `var(--color-brand-500)` for the places a utility does not reach, like a
 * gradient stop or a `color-mix`.
 *
 * The namespace prefix is what decides which utilities appear. `--color-*`
 * generates colour utilities, `--spacing-*` generates padding, margin and gap,
 * `--font-*` generates `font-`, `--container-*` names container-query
 * breakpoints. It is a naming convention doing the work of a config file.
 *
 * **What changed from v3**, since most material online is still v3:
 *
 *   config file       replaced by @theme in CSS
 *   PostCSS plugin    replaced by @tailwindcss/vite, which is much faster
 *   @tailwind base    replaced by @import "tailwindcss"
 *   theme() in CSS    replaced by plain var(--color-brand-500)
 *   content globs     gone; v4 scans your source automatically
 *
 * **Arbitrary values are a pressure valve, not a workflow.** `bg-[#3b5bdb]` and
 * `p-[13px]` work, and every one of them is a decision nobody else can find
 * later. If a value appears twice, it wants a token. The whole reason a utility
 * vocabulary is worth adopting is that it is a closed set; arbitrary values
 * reopen it.
 *
 * **A class that references a token that does not exist does nothing.** No
 * error, no warning: Tailwind simply does not generate `bg-brand-900` if
 * `--color-brand-900` was never declared, and you get an unstyled element. The
 * test beside this file checks every brand shade the lesson uses against what
 * `tailwind.css` actually declares, which is the cheapest possible guard
 * against a silent typo.
 */

const SHADES = ["50", "200", "500", "700"] as const;

export function TailwindTheme() {
  return (
    <div className="stack">
      <h3>Colour utilities from one @theme block</h3>
      <div className="flex flex-wrap gap-gutter" data-testid="swatches">
        {SHADES.map((shade) => (
          <div
            key={shade}
            data-testid={`swatch-${shade}`}
            className={`rounded-lg border border-brand-500 px-4 py-2 text-sm bg-brand-${shade}`}
          >
            brand-{shade}
          </div>
        ))}
      </div>

      <h3>The same tokens, as plain custom properties</h3>
      <p
        data-testid="custom-property"
        style={{
          padding: "var(--spacing-gutter)",
          borderRadius: "0.625rem",
          // A utility cannot express this. The token can.
          background: "color-mix(in oklab, var(--color-brand-500) 15%, transparent)",
          borderInlineStart: "4px solid var(--color-brand-700)",
        }}
      >
        <code>color-mix</code> with <code>var(--color-brand-500)</code>, which no utility covers.
      </p>

      <h3>A component class, for a pattern that repeats</h3>
      <div className="panel" data-testid="panel">
        <code>.panel</code> is declared in <code>@layer components</code> in{" "}
        <code>src/tailwind.css</code>, so any utility still beats it.
      </div>

      <p className="note">
        The swatch classes are built by interpolation above, which is worth knowing about: Tailwind
        scans your source as text, so <code>bg-brand-{"{shade}"}</code> would find nothing. It works
        here only because every shade also appears literally in this file.
      </p>
    </div>
  );
}
