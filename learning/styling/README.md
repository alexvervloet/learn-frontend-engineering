# Styling 🟢

Seven lessons on how CSS reaches a React component in 2026: scoped stylesheets,
Tailwind 4's CSS-first config, a two-tier token system, the layout features that
replaced JavaScript measurement, and a variant API that does not fall over when
someone passes a `className`.

## What the files cover

### Writing the CSS

| File                    | What it teaches                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `01_css_modules.tsx`    | Two files both declaring `.title`, and why neither collides. `composes` adds a class reference, not a copy of the declarations |
| `02_tailwind_theme.tsx` | No `tailwind.config.js`. A token in `@theme` becomes a custom property _and_ a family of utilities. What changed from v3       |
| `03_design_tokens.tsx`  | Primitive vs semantic tokens. Three theme states, and the one selector that stops a dark OS overriding the user's choice       |

### Modern layout

| File                       | What it teaches                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `04_container_queries.tsx` | A card cares about its own width, not the viewport's. Side by side with the `ResizeObserver` version it replaces                    |
| `05_cascade_layers.tsx`    | Layer order beats specificity. Unlayered CSS beats every layer, which is how you tame a third-party stylesheet without `!important` |

### Building components

| File              | What it teaches                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `06_variants.tsx` | `cva` for the variant table, `clsx` for conditionals, `tailwind-merge` for conflicts. Why `className` goes last in `cn()` |
| `07_motion.tsx`   | CSS transitions first, Motion for what CSS cannot do, and a cross-fade for people who asked for less movement             |

Supporting files: `src/tailwind.css` (the `@theme` block), `src/tokens.css`
(semantic roles and the three theme states), `src/layers.css`,
`src/motion.css`, `src/cn.ts`, `src/useReducedMotion.ts`.

## Run it

```bash
npm install                     # from the repo root, once
npm run dev -w learning/styling
npm test -- --project styling
```

## What these tests can and cannot prove

jsdom parses CSS but does no layout, and implements neither `@container` nor
`@layer`. `getComputedStyle` will happily tell you an element is 0 pixels wide.
So the suite asserts three kinds of thing, and is explicit about which:

**Logic**, properly. `tailwind-merge` resolving `px-2` against `px-4`, `cva`
picking a compound variant, `motionPropsFor` dropping the travel, the width
threshold the `ResizeObserver` version branches on.

**Structure**, by reading the stylesheets from disk. That the dark block
redefines every role the light block declares, that the layer order is declared
up front, that `@theme` declares every `brand-` shade the components render.
These catch the failures that are otherwise silent: a missing token produces no
CSS and no warning, just an unstyled element.

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

## Not covered here

CSS-in-JS runtimes, `@scope`, `:has()` beyond a mention, view transitions,
critical CSS extraction, and the build-size side of a utility framework. View
transitions belong with routing; bundle size belongs with performance.
