# Accessibility 🟢

Five lessons on the model, the keyboard, and the limits of the tooling. Every
assertion in this module is also an accessibility assertion, which is the
argument the whole repo has been making since the testing module: a component a
test cannot find by role is one a screen reader cannot announce.

## What the files cover

| File                      | What it teaches                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `01_the_tree.tsx`         | Role, name, state. A `<div onClick>` has none of the three. Where the name comes from, and how `aria-label` breaks voice control  |
| `02_keyboard.tsx`         | Tab order is DOM order. The three meanings of `tabIndex`, a skip link, and a roving tabindex that turns twenty tab stops into one |
| `03_focus_management.tsx` | A dialog that traps both directions and gives focus back. What to do when you delete the row that had focus                       |
| `04_live_regions.tsx`     | `status` vs `alert`, and the bug: a region rendered _with_ its content is often silent                                            |
| `05_axe.tsx`              | What axe catches, and a third panel that passes it and is unusable                                                                |

`src/axe.ts` is a twenty-line wrapper over axe-core that formats violations
into something a failing test can print.

## Run it

```bash
npm install                           # from the repo root, once
npm run dev -w learning/accessibility
npm test -- --project accessibility
```

With VoiceOver (⌘F5) or NVDA running, Tab through each lesson. That is the
only way to experience what these tests assert structurally.

## axe finds about a third of it

That is Deque's own estimate, and it is the most useful thing to know about
automated accessibility testing, because a green axe run is routinely mistaken
for an accessible page.

What it catches reliably: a missing `alt`, an unlabelled field, a button with
no accessible name, a skipped heading level, insufficient contrast, a positive
`tabindex`, invalid ARIA.

What it cannot: a label that says Name on an email field, a button announced
as something other than what it says, a tab order that is valid and absurd,
focus that goes nowhere after a delete, a live region nobody registered.
Lesson 05 has a panel with three such problems and axe reports none of them.

One of the three is caught by a _different_ tool, which is the more useful
version of the point. `jsx-a11y/img-redundant-alt` flags `alt="image"` from
the source, before anything renders; axe sees a string at runtime and cannot
tell it from a good one. The linter reads your code, axe reads a rendered
tree, and a role-and-name query reads what the user is told. Three tools, three
different blind spots, and this repo runs all three.

## Where each check runs

| Check                            | Where                                           |
| -------------------------------- | ----------------------------------------------- |
| Role, name, state                | Vitest, via `getByRole` in every lesson         |
| Keyboard order and focus         | Vitest, via `userEvent.tab()` and `toHaveFocus` |
| axe rules that need no rendering | Vitest, `src/axe.ts`                            |
| **Colour contrast**              | `learning/testing/e2e/axe.spec.ts`, in Chromium |
| Whether it is actually usable    | A person, with a screen reader                  |

Contrast is the clearest case. It needs computed styles against rendered
pixels, so jsdom cannot evaluate it and axe reports it as _incomplete_ rather
than passing. `src/axe.ts` disables the rule explicitly rather than let a run
look cleaner than it is, and `@axe-core/playwright` picks it up in a real
browser.

## The two bugs most worth remembering

**A conditionally rendered live region is often silent.** Screen readers
register live regions when they enter the tree and then watch them. A region
that appears _with_ its content is a new node, not a change to a watched one.
Render the container always, empty, and change its text.

**Moving `tabIndex` without moving focus.** In a roving tabindex, setting
which element is the tab stop does nothing for the user until `focus()` is
called. The tab stop moves and the keyboard does not.

## Not covered here

ARIA authoring practices in full (combobox, tree, grid), reduced motion (the
styling module), colour blindness and contrast maths, screen reader differences,
`inert`, and the legal standards: WCAG 2.2 AA, the European Accessibility Act,
Section 508.
