# Projects

Capstones. Each one is an app rather than a set of lessons, and each combines
what several modules teach.

Nothing is here yet. The plan, in the order they are meant to be read:

| Project | What it pulls together |
|---|---|
| bookmark-manager | React Router, TanStack Query, React Hook Form and Zod, tested end to end with Playwright, containerised behind nginx |
| dashboard | Charts, a virtualised table, full keyboard support, and a measured bundle |
| next-storefront | Next 16 Server Components, server actions, ISR |

`bookmark-manager` is built to talk to the Express API of the same name in
[Practice-Backends](https://github.com/alexvervloet/learn-javascript-backend-engineering),
and ships an MSW handler set so it also runs with no backend at all.
