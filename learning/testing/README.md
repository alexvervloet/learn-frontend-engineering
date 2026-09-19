# Testing 🟢 🎭

Five lessons on writing a test worth having, plus the two things this repo had
been promising and not doing: a real browser suite and a Storybook.

🎭 means the end-to-end suite needs Chromium. `npm run e2e:install -w
learning/testing` fetches it, once.

## What the files cover

| File                      | What it teaches                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `01_queries.tsx`          | The query ranking is an accessibility argument. The same panel built semantically and as divs: one is unreachable by role, by label and by keyboard, and its test still passes |
| `02_async.tsx`            | `getBy`, `queryBy`, `findBy`, one job each. `waitForElementToBeRemoved` is stronger than waiting for the result. What the act warning is telling you                           |
| `03_mocking.tsx`          | `vi.fn`, `vi.spyOn`, the `vi.mock` hoisting trap and `vi.hoisted`, fake timers, and why the network is not a thing to mock                                                     |
| `04_what_not_to_test.tsx` | Two tests of one component: one fails on a CSS rename, one fails when it genuinely breaks                                                                                      |
| `05_layers.tsx`           | jsdom's ceiling, and which tool to reach for past it                                                                                                                           |

| Elsewhere                          | What it is                                                   |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/components/Badge.stories.tsx` | Stories with `play` functions, and an a11y-checked component |
| `src/components/Badge.test.tsx`    | The same stories run in Vitest with `composeStories`         |
| `e2e/`                             | Playwright, pointed at the **styling** module                |
| `.storybook/`                      | Storybook 10 on the Vite builder, with the a11y addon        |

## Run it

```bash
npm install                     # from the repo root, once
npm run dev -w learning/testing
npm test -- --project testing

npm run e2e:install -w learning/testing   # Chromium, once
npm run e2e -w learning/testing           # starts the styling dev server itself
npm run storybook -w learning/testing     # http://localhost:6006
```

## The e2e suite tests a different module on purpose

The [styling README](../styling/README.md) says plainly that three of its
claims cannot be checked in jsdom: container queries, cascade layers and
`prefers-color-scheme`. jsdom does no layout, implements neither `@container`
nor `@layer`, and has no OS preference to read.

`e2e/` finishes that job. It points Playwright at
`npm run dev -w learning/styling` and asserts the computed `flex-direction` at
two container widths, that a single-class selector in a later layer beats a
three-class selector in an earlier one, and that clicking "light" on a
dark-themed OS actually changes the rendered colour.

A suite that says "you would have to verify this in a browser" and then never
does is not much better than no suite. Nine specs, about three seconds.

## Stories are tested, not just browsed

`composeStories` applies each story's args and decorators and hands back plain
components, so the states documented in Storybook are the states under test.
Delete a story and `Badge.test.tsx` stops compiling.

```tsx
const { NumericWithLabel } = composeStories(stories);

const { container } = render(<NumericWithLabel />);
expect(NumericWithLabel.play).toBeDefined();
await NumericWithLabel.play?.({ canvasElement: container });
```

Two things worth copying from that snippet. The story is rendered through
Testing Library rather than with `Story.run()`, because `run()` mounts into a
root that RTL's `cleanup` knows nothing about and every story then leaks its
DOM into the next test. And `play` is optional on a `Story`, so
`await Story.play?.(…)` on a story that lost its play function would pass
silently; asserting it exists first keeps the test honest.

## The rule that survives

> Would this test fail if the feature broke, and pass if I rewrote how it
> works?

Both halves. A test that only satisfies the first is brittle; one that only
satisfies the second is not testing anything.

## Not covered here

Visual regression (Playwright screenshots, Chromatic), component testing in a
real browser with `@vitest/browser`, contract testing against a real API,
mutation testing, and load testing. `@vitest/browser` in particular is worth
watching: it closes most of the jsdom gap this module is organised around.
