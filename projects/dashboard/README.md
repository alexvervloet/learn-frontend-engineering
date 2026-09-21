# Dashboard

A time-series chart and a ten-thousand-row table, both accessible, in light
and dark. The second capstone.

The first capstone, [bookmark-manager](../bookmark-manager), is about data:
fetching, caching, mutating, routing. This one is about what you draw with
the data once you have it, and about the two places React apps usually fall
over when they try: a chart nobody can read without a mouse, and a long list
that either renders ten thousand DOM nodes or becomes invisible to a screen
reader.

```bash
npm run dev -w projects/dashboard        # http://localhost:5210
npm test -w projects/dashboard           # 68 tests in jsdom
npm run e2e -w projects/dashboard        # 27 tests in Chromium, light and dark
npm run budget -w projects/dashboard     # fails the build if the bundle grows
npm run analyse -w projects/dashboard    # a treemap of what is in it
```

## What to read, in order

| File                                                             | What it shows                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`src/chart/scale.ts`](src/chart/scale.ts)                       | The arithmetic a chart library would hide. Pure functions, no DOM.           |
| [`src/chart/TrafficChart.tsx`](src/chart/TrafficChart.tsx)       | An SVG chart by hand: marks, a legend, direct labels, a hover layer.         |
| [`src/table/events.ts`](src/table/events.ts)                     | Sorting, filtering, and the window a virtualiser renders.                    |
| [`src/table/EventTable.tsx`](src/table/EventTable.tsx)           | Ten thousand rows, about twenty in the DOM, and a keyboard that still works. |
| [`src/styles.css`](src/styles.css)                               | Two themes as tokens, each one validated against its own surface.            |
| [`scripts/check-bundle-size.mjs`](scripts/check-bundle-size.mjs) | A budget that fails, rather than a number in a report nobody opens.          |

## The chart is hand-rolled, and that is the point

Recharts or Visx would draw this in a quarter of the code. The trade is that
you would learn how to configure a chart library rather than what a chart is
made of, and every chart library eventually makes you reach past it.

So: `linePath` turns numbers into an SVG `d` attribute, `niceExtent` picks a
round axis top and the step that goes with it, `yAt` maps a value to a
y-coordinate, and `indexAtX` maps a pointer position back to a data index.
All four are pure and all four are tested without a browser.

Some decisions worth knowing about, because a library would make them for you
and it does not always make them well:

**Three series on one scale, never two y-axes.** A dual-axis chart lets
whoever drew it choose where the lines cross, so any "these two correlate"
reading is an artefact of the axis choice. Two measures of different size go
in two charts.

**The scale comes from every series, not the visible ones.** Hide the largest
line and the rest stay where they were. Rescaling to the survivors makes
every remaining line jump upward and read as growth.

**Colour follows the channel, not its rank.** Referral is the same green
whether it is the only series or the third. A palette assigned by position
repaints the survivors whenever a filter changes the count, and there is a
test for it.

**Straight segments, not a spline.** A smoothed curve invents values between
the points, and it can dip below zero between two positive days.

**The axis step is chosen before the tick count.** Picking a round maximum and
then dividing it into four gives ticks at 1,500. Picking a round step and
letting the count fall out of it gives round ticks always. That was a real
bug, and it is in [LESSONS.md](../../LESSONS.md).

## The palette is computed, not chosen

Both themes went through the `dataviz` validator: the lightness band, the
chroma floor, colour-vision-deficiency separation between adjacent pairs, the
normal-vision floor, and contrast against the surface.

|       | direct    | search    | referral  | surface   |
| ----- | --------- | --------- | --------- | --------- |
| Light | `#2a78d6` | `#eb6834` | `#1baf7a` | `#fcfcfb` |
| Dark  | `#3987e5` | `#d95926` | `#199e70` | `#1a1a19` |

Dark is a selected set of steps, not an inverted light one. Flipping the
lightness of a palette that passes gives you a palette that does not.

One warning stands: on the light surface the green measures 2.74:1, below the
3:1 a mark should clear. That obliges relief rather than a different green,
and there are two kinds here. Every series carries a direct label at its end,
and the whole chart has a table view behind a button. Colour never carries
identity on its own.

`--accent` is a separate token from `--series-direct`, and the reason is in
the stylesheet: white on the series blue measures 4.41:1, which fails at
14px, and a button painted in a series colour looks like a fourth line.

## Ten thousand rows, twenty in the DOM

TanStack Virtual renders the rows in the viewport plus eight either side. The
interesting part is not the virtualisation, which is a library call. It is
everything virtualisation breaks.

**A screen reader cannot count rows that are not there.** The grid declares
`aria-rowcount={rows.length}`, and each rendered row declares its real
`aria-rowindex`, offset past the header. Without that, "row 3 of 20" is a
lie.

**Tab must get past the table.** Ten thousand focusable rows is a trap you
scroll out of. The grid is one tab stop, and arrow keys, Page Up/Down, Home
and End move a roving selection inside it.

**The row a screen reader is pointed at has to exist.** DOM focus stays on
the grid and `aria-activedescendant` names the active row, because moving
real focus into a row fights the virtualiser: it unmounts the focused element
as soon as it scrolls away. Moving the selection calls
`virtualizer.scrollToIndex`, so the named row is always rendered. There is a
Playwright test that presses End and asserts the element that
`aria-activedescendant` points at is visible.

**The grid is its own scroll container.** Wrapping a scrolling div inside it
creates a scroll region nobody can reach by keyboard, which axe flags as
`scrollable-region-focusable`. Giving that div a tabIndex would put a second
tab stop inside one widget. Making the grid scroll removes the problem
instead of patching it.

## Where each test runs, and why

68 tests in jsdom, 27 in Chromium. The split is not about speed.

jsdom does no layout. Every element measures zero pixels, there is no
compositor, and `@container`, `prefers-color-scheme` and real measurement all
do nothing. So jsdom gets the logic and the structure: the scale arithmetic,
the sorting and filtering, the ARIA, the key handling, which series is drawn.

Chromium gets everything that needs a real box. How many rows are painted.
Whether the crosshair follows the pointer, which maps a client x back through
the SVG's bounding box and divides by zero in jsdom. Whether the three direct
labels overlap each other. Whether the page overflows sideways at 380px.
Whether axe finds a contrast failure, in each scheme, against actual painted
pixels.

The unit tests do stub one thing: the grid's `offsetHeight`, because a
virtualiser told its viewport is 0px tall is correct to render nothing, and
without the stub every assertion about a row passes against an empty grid.
That stub buys the component's own arithmetic. It cannot tell you what a
browser paints, and the test that does is in `e2e/table.spec.ts`.

## The budget

`npm run budget` gzips the built assets and exits non-zero over 95 KB of JS
or 6 KB of CSS. It runs in CI after the build.

A budget in a report is a number nobody reads. A budget that fails the build
is a conversation at the moment someone adds the dependency, which is the
only moment the trade-off is still cheap to reverse.

Current: 78.8 KB and 3.6 KB. `npm run analyse` opens a treemap if you want to
know what is using it.

## What this deliberately does not do

No chart library, no data fetching, no router. The data is generated by a
seeded PRNG so a test and a screenshot agree run to run. Fetching, caching
and routing are the [bookmark-manager](../bookmark-manager)'s subject, and
putting them here again would bury the parts that are new.
