# Styling 🟢

Eight lessons on how CSS reaches a React component in 2026: scoped
stylesheets, Tailwind 4's CSS-first config, a two-tier token system, the layout
features that replaced JavaScript measurement, a variant API that does not fall
over when someone passes a `className`, and the two platform features that
between them replace a popover library.

## What the files cover

### Writing the CSS

| File                    | What it teaches                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `01_css_modules.tsx`    | Two files both declaring `.title`, and why neither collides. `composes` adds a class reference, not a copy of the declarations        |
| `02_tailwind_theme.tsx` | No `tailwind.config.js`. A token in `@theme` becomes a custom property _and_ a family of utilities. What changed from v3              |
| `03_design_tokens.tsx`  | Primitive vs semantic tokens. `light-dark()`, so a role cannot have one value without the other, and three states from `color-scheme` |

### Modern layout

| File                       | What it teaches                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `04_container_queries.tsx` | A card cares about its own width, not the viewport's. Side by side with the `ResizeObserver` version it replaces                    |
| `05_cascade_layers.tsx`    | Layer order beats specificity. Unlayered CSS beats every layer, which is how you tame a third-party stylesheet without `!important` |

### Building components

| File                    | What it teaches                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `06_variants.tsx`       | `cva` for the variant table, `clsx` for conditionals, `tailwind-merge` for conflicts. Why `className` goes last in `cn()`     |
| `07_motion.tsx`         | CSS transitions first, Motion for what CSS cannot do, and a cross-fade for people who asked for less movement                 |
| `08_popover_anchor.tsx` | `popover` for the top layer, `popovertarget` for a dropdown with no JavaScript, and `anchor-name` instead of a measuring loop |

Supporting files: `src/tailwind.css` (the `@theme` block), `src/tokens.css`
(semantic roles and the three theme states), `src/layers.css`,
`src/motion.css`, `src/popover.css`, `src/cn.ts`, `src/useReducedMotion.ts`.

## Run it

```bash
npm install                     # from the repo root, once
npm run dev -w learning/styling   # http://localhost:5173
npm test -- --project styling
```

## What these tests can and cannot prove

jsdom parses CSS but does no layout, and implements neither `@container` nor
`@layer`. `getComputedStyle` will happily tell you an element is 0 pixels wide.
So the suite asserts three kinds of thing, and is explicit about which:

**Logic**, properly. `tailwind-merge` resolving `px-2` against `px-4`, `cva`
picking a compound variant, `motionPropsFor` dropping the travel, the width
threshold the `ResizeObserver` version branches on.

**Structure**, by reading the stylesheets from disk. That every semantic role
is a `light-dark()` pair, that the layer order is declared up front, that
`@theme` declares every `brand-` shade the components render. These catch the
failures that are otherwise silent: a missing token produces no CSS and no
warning, just an unstyled element.

That first one used to read "the dark block redefines every role the light
block declares", which is the same worry one level less certain. Two parallel
lists can drift and a test can notice; one list of `light-dark()` pairs cannot
drift, because the function takes two arguments. The test changed from
detecting the mistake to checking the property that makes it unspellable, and
that is the better trade when it is available.

**Markup**, that the right classes are on the right elements, including that
the `@container` element is not the same element as the one querying it.

What is left over is whether it _looks_ right, and that needs a real browser.
The testing module does it with Playwright.

## Preflight is deliberately not loaded

`src/tailwind.css` imports `tailwindcss/theme.css` and
`tailwindcss/utilities.css`, not `tailwindcss`. The full import includes
Preflight, whose reset would strip the shared lesson shell's buttons, headings
and lists back to nothing.

This is not advice for an app. Take Preflight in an app: a consistent baseline
across browsers is most of the point. Leave it out only when you are adding
Tailwind to something that already has a reset, which is the situation here.

## One thing that surprised me

`import tailwindCss from "../tailwind.css?raw"` returns an **empty string**
under Vitest. This module processes only `.module.css`, and everything else is
stubbed out before `?raw` is honoured. Nothing errors: every assertion against
the file's contents just passes vacuously. The tests read the stylesheets with
`node:fs` and `import.meta.dirname` instead.

## The popover lesson is mostly checked in a browser

jsdom has no popover API at all: no `showPopover`, no top layer, no
`:popover-open`. Worse, its `CSS.supports` answers `true` for anchor
positioning it does not implement, so a feature check there is a false
positive. The suite says so out loud rather than letting the `true` read as a
passing test.

What it does check here is the markup and the stylesheet: that `popovertarget`
points at the right id, that `anchor-name` is on the trigger and
`position-anchor` on the popover rather than the other way round, and that the
`@supports not (anchor-name: …)` fallback exists. Those are the silent
failures. A typo'd anchor name produces no error and no warning, just a
tooltip in the wrong corner.

One assertion is worth copying: a closed `[popover]` is `display: none` from
the UA stylesheet, so everything inside it is out of the accessibility tree.
jsdom implements that part, which means the suite can check that a screen
reader user does not find a Close button for a popover nobody opened.

`learning/testing/e2e/popover.spec.ts` covers the rest against Chromium: that
it opens, that it sits above an `overflow: hidden` ancestor, that Escape closes
the `auto` one and returns focus to the trigger, that the `manual` one ignores
both Escape and an outside click, and that the popover tracks the button as the
page scrolls with no scroll listener anywhere.

## The fallback nobody can run any more

`popover.css` has an `@supports not (anchor-name: --probe)` block for a browser
with the Popover API and without anchor positioning. That combination was real
for about a year and is still real for anyone on an older release.

It is not reachable from the test suite. All three engines Playwright ships
support anchor positioning now, and it cannot be switched off:
`--disable-blink-features=CSSAnchorPositioning` and its variants have no effect
once a feature has shipped.

Leaving it there asserted-but-never-run is how a fallback rots, so the spec
parses the block's declarations out of the real stylesheet, applies them to the
popover with the anchored properties neutralised, and measures where it lands.

That found a bug the structural test could not. `[popover]` carries UA styles
of `inset: 0` and `margin: auto`. The original block set `inset-block-end` and
`inset-inline-start` and nothing else, so the other two edges stayed pinned at
0, the auto margins resolved against them, and the popover sat 176 pixels off
centre. It read correctly and positioned nothing. The block now starts with
`inset: auto` and `margin: 0`.

The general version: a fallback for a condition your browsers no longer meet is
untested code with a straight face. Either exercise its contents some other
way, or delete it and say the feature is required.

## Not covered here

CSS-in-JS runtimes, `@scope`, `:has()` beyond a mention, view transitions,
critical CSS extraction, and the build-size side of a utility framework. View
transitions belong with routing; bundle size belongs with performance.
