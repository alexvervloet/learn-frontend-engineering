# Astro islands 🟢 🎭

Astro 7 with React. Four pages and an end-to-end suite that checks the one
claim the whole framework rests on: a page with a React component on it that
loads **zero** JavaScript.

Like the Next module, this is a real project rather than lessons in a shell,
because the build output is the subject.

## What the files cover

| File                         | What it teaches                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/pages/index.astro`      | The inversion: static by default, interactive by exception. When that fits and when it does not |
| `src/pages/static.astro`     | A React component with no directive. Rendered at build time, code never shipped, buttons inert  |
| `src/pages/islands.astro`    | Two islands on one page, hydrated separately, unable to share state                             |
| `src/pages/directives.astro` | `client:load`, `client:idle`, `client:visible`, `client:only`, and what each costs              |
| `src/layouts/Base.astro`     | Frontmatter runs at build time and cannot become client code                                    |

## Run it

```bash
npm install                            # from the repo root, once
npm run dev -w learning/astro-islands  # http://localhost:5191
npm run build -w learning/astro-islands

npm run e2e:install -w learning/astro-islands   # Chromium, once
npm run e2e -w learning/astro-islands
```

## The assertion that matters

```ts
page.on("response", (response) => {
  if (response.request().resourceType() === "script") scripts.push(response.url());
});

await page.goto("/static/");
await expect(page.getByTestId("static-counter")).toBeVisible();

expect(scripts).toEqual([]);
```

Not "a small bundle". None. The component rendered, its markup is in the page,
and its code is nowhere. The companion test clicks the button and asserts the
count _does not change_, which is the honest consequence rather than something
to hide.

## The directives, in the order to reach for them

| Directive             | Hydrates                           | Use for                                |
| --------------------- | ---------------------------------- | -------------------------------------- |
| none                  | Never                              | Most of a content page                 |
| `client:visible`      | When scrolled into view            | Anything below the fold                |
| `client:idle`         | When the browser is free           | Should work soon, not why they came    |
| `client:load`         | Immediately                        | The thing the user came to use         |
| `client:only="react"` | Immediately, never server-rendered | Needs a browser: a map, a canvas chart |

Getting this wrong does not crash. `client:load` on everything is a slower
page that still works, which is why it happens. `client:visible` on the
primary control means the first click does nothing.

## When Astro is the wrong answer

**Islands cannot share state.** Each is its own React root: no context, no
common parent, no store between them. Two counters is fine. A basket that
three separate islands need to read and write is a fight, and the escape
hatches (state in the URL, a framework-agnostic store, or merging the islands)
are all worse than just shipping a SPA.

So: content-led sites, yes. Docs, marketing, blogs, anything mostly text.
An app that is one long interaction, no.

## Two things that cost time

**`astro preview` daemonises.** It forks, prints a pid, and the foreground
process exits, so Playwright reports "Process from config.webServer exited
early" while the server runs perfectly well on the port. There is a
`--background` flag and no `--foreground` one. Astro's output is plain static
files, so the config uses `vite preview` instead, which stays in the
foreground.

**A static server does not guess trailing slashes.** Astro writes
`dist/static/index.html`, and its own preview server serves that for `/static`
as well as `/static/`. A plain static server falls through to the SPA fallback
and returns the **index page with a 200**, so twelve tests failed while
asserting about the wrong document. `trailingSlash: "always"` in
`astro.config.mjs` makes the contract explicit, and is worth setting for any
static host rather than relying on one server's redirect behaviour.

## Not covered here

Content collections and their schemas, which is most of why people pick Astro
for a docs site. View transitions. Server-side rendering with an adapter.
Multiple UI frameworks on one page, which Astro supports and which is a
narrower need than the marketing suggests.
