# Projects

Capstones. Each one is an application rather than a set of lessons, and each
combines what several modules teach.

| Project                               | Needs    | What it pulls together                                                                                               |
| ------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| [bookmark-manager](bookmark-manager/) | 🟢 🎭 🐳 | React Router, TanStack Query, React Hook Form and Zod, tested end to end with Playwright, containerised behind nginx |
| [dashboard](dashboard/)               | 🟢 🎭    | A hand-rolled SVG chart, a 10,000-row virtualised grid, two themes, and a bundle budget that fails the build         |
| [next-storefront](next-storefront/)   | 🟢 🎭    | Next 16 Server Components, validated server actions, a cookie cart, streaming search, and forms that work with no JS |

All three are built. Read them in that order: `bookmark-manager` is the
smallest, `next-storefront` is the one with a server in it.

[bookmark-manager](bookmark-manager/) is built to talk to the Express API of
the same name in
[Practice-Backends](https://github.com/alexvervloet/learn-javascript-backend-engineering),
and ships an MSW handler set so it also runs with no backend at all.

## How a capstone differs from a module

A module's job is to isolate one idea and prove it with a test. A capstone's
job is to show what happens when the ideas meet: a mutation that has to
invalidate the right cache key, a form whose focus management interacts with
a router's, a token whose storage decides what a page reload does.

Every bug worth reading about in these is in the project's own README, under
a heading that says what the tests found.
