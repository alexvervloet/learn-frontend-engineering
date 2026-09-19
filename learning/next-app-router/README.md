# Next App Router 🟢 🎭

Next 16, App Router. Four routes, each one a lesson, and an end-to-end suite
that checks the claims only a browser can settle: that the pages work with
JavaScript disabled, that the server data module never reaches a bundle, and
that the shell paints before the slow section.

This module is shaped differently from the others. It is a real Next app, not
a Vite app with a lesson sidebar, because the App Router _is_ the subject and
wrapping it in a shell would hide it. The teaching is in the docblock at the
top of each route file.

## What the files cover

| File                           | What it teaches                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `app/layout.tsx`               | The root layout renders `<html>` itself. There is no `index.html` in this project                     |
| `app/products/page.tsx`        | An `async` Server Component that `await`s its own data. No effect, no loading state, no query library |
| `app/products/[slug]/page.tsx` | The client boundary: what crosses it, and why the boundary belongs on a leaf                          |
| `components/AddToBasket.tsx`   | The only thing on that page in the browser bundle                                                     |
| `app/streaming/page.tsx`       | Suspense as a performance decision, and why a static page does not stream                             |
| `app/actions/actions.ts`       | A server action, and why it is a public endpoint                                                      |
| `components/ReviewForm.tsx`    | `useActionState` and `useFormStatus`, which are React's, not Next's                                   |

## Run it

```bash
npm install                             # from the repo root, once
npm run dev -w learning/next-app-router # http://localhost:5190
npm run build -w learning/next-app-router

npm run e2e:install -w learning/next-app-router   # Chromium, once
npm run e2e -w learning/next-app-router
```

## Why there are no Vitest tests here

Every other module asserts in jsdom first and reaches for a browser only for
what jsdom cannot do. This one is the other way round, and the reason is worth
stating rather than glossing.

An async Server Component is not a component you can render with Testing
Library. It returns a promise, it runs in a different React environment with a
different module graph, and rendering it in jsdom would exercise a version of
the code the framework never runs. The interesting claims here are all about
the boundary between server and client, which only exists in a real request:

| Claim                                 | How it is checked                               |
| ------------------------------------- | ----------------------------------------------- |
| The data is in the HTML               | `request.get()` and read the bytes              |
| The data module is in no bundle       | Fetch every `.js` the page loads and grep them  |
| The page works without JavaScript     | `javaScriptEnabled: false`                      |
| The shell paints before the slow part | `waitUntil: "commit"`, then assert the fallback |
| The action works before hydration     | Submit with scripting off                       |

Testing against `next dev` would be easier and would prove much less: dev
compiles on demand, disables most caching, and renders everything dynamically.
The Playwright config runs `next build && next start`.

## Three things that surprised me

**A static page does not stream.** `/streaming` had no request-specific input,
so Next prerendered it at build time: the 700ms delay happened once during the
build and every visitor got a finished file. The first version of the e2e test
asserted a fallback no user would ever see. The route now sets
`dynamic = "force-dynamic"` so the lesson has something to show, with a note
that in a real app you would make it dynamic by reading `cookies()` or
`searchParams` instead. The build output tells you which is which:

```
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Streamed content needs JavaScript to appear.** React sends the fallback
where the boundary is, the real markup further down inside a `hidden`
container, and a `$RC(…)` script that swaps them. With scripting off the swap
never runs: a crawler parsing the HTML finds the content, a person sees the
fallback. Anything that must render without JavaScript belongs outside every
boundary. The test asserting the opposite failed, correctly.

**Next prefetches every link in the viewport.** An assertion that a page made
"no client-side requests" found eight, all of them `?_rsc=` prefetches of the
nav. The useful assertion was not how many requests happened but whether any
of them carried the content, which was pushed into the original response.

## The rules worth carrying away

**Push the client boundary down.** `"use client"` at the top of a page sends
the page to the browser. Put it on the button.

**Only serialisable props cross.** Strings, numbers, plain objects, Dates,
Maps, promises, and JSX. Not functions, unless they are server actions. A
callback prop fails at build time.

**A server action is a public endpoint.** Anyone can post to it with anything.
Validate and authorise inside it; the form's `minLength` is a hint to the
person typing.

**`revalidatePath` is not optional.** The rendered page is cached, so without
it the action succeeds and nothing on screen changes.

## Not covered here

Parallel and intercepting routes, route handlers, middleware, the full caching
model (`fetch` cache tags, `unstable_cache`, `revalidateTag`), partial
prerendering, `next/image` and `next/font`, and deployment beyond `next start`.
The caching model in particular is large enough to deserve its own module and
changes faster than anything else in Next.
