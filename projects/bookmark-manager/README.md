# Bookmark manager 🟢 🎭 🐳

The first capstone. A real application rather than a set of lessons, built
from what the modules teach and running against the Express API of the same
name in
[Practice-Backends](https://github.com/alexvervloet/learn-javascript-backend-engineering).

It also runs with no backend at all: MSW answers the same routes.

## What it is made of

| Module                                         | What this app uses from it                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| [routing](../../learning/routing/)             | Nested layout, filters and pagination in the URL, a splat route                        |
| [data-fetching](../../learning/data-fetching/) | TanStack Query, prefix invalidation, optimistic favouriting with rollback              |
| [forms](../../learning/forms/)                 | React Hook Form with a Zod schema, an error summary that takes focus                   |
| [styling](../../learning/styling/)             | Tailwind 4 with `@theme`, semantic tokens, dark mode, reduced motion                   |
| [accessibility](../../learning/accessibility/) | Skip link, focus management on navigation, a dialog that traps both ways, live regions |
| [testing](../../learning/testing/)             | 59 Vitest assertions over MSW, 12 Playwright specs including axe                       |
| [production](../../learning/production/)       | Token in memory, `sourcemap: "hidden"`, Docker and nginx                               |

## Run it

```bash
npm install                            # from the repo root, once
npm run dev -w projects/bookmark-manager      # http://localhost:5200
npm test -- --project bookmark-manager

npm run e2e:install -w projects/bookmark-manager   # Chromium, once
npm run e2e -w projects/bookmark-manager
```

Sign in with **ada** / **correct-horse**. Anything else gets a 401, because a
login form with no failure path is not a login form.

### Against the real backend

```bash
# In Practice-Backends
docker compose -f backends/bookmark-manager/docker-compose.yml up -d
npx tsx backends/bookmark-manager/app/main.ts       # http://localhost:8000

# Here
VITE_USE_MOCK=false npm run dev -w projects/bookmark-manager
```

`vite.config.ts` proxies `/api` to `VITE_API_PROXY`, so no CORS setup is
needed. The wire format is transcribed in `src/api/types.ts`, including the
snake_case the server sends: `toBookmark` converts once, at the boundary, and
nothing past `src/api` knows the server's shape.

## Three decisions worth explaining

**The access token lives in a module variable.** Not `localStorage`, which
any script on the origin can read, including one injected by XSS or shipped
in a dependency. The cost is honest and visible: reloading signs you out. A
real deployment pairs this with a refresh token in an HttpOnly, Secure,
SameSite cookie scoped to the refresh endpoint. The production module's auth
lesson has the comparison.

**One route table, used by the app and by every test.** `src/routes.tsx`
exports it; the app builds a browser router over it, tests build a memory
router with `initialEntries`. A test starts on any page with no mocking, and
the routes under test are the routes that ship.

**The mock is not more helpful than the server.** The real API returns a bare
array with no total, so the client asks for one row more than a page to work
out whether a next page exists. A mock that returned a count would let you
write a client that cannot work against the real thing.

## Four bugs the tests found

**`select` transforms on read; the cache holds what the query function
returned.** The optimistic favourite wrote the selected
`{ items, hasNextPage }` shape back into a cache holding a plain array. The
symptom was an optimistic update that appeared to do nothing at all.

**An async resolver lands errors a render after `submitCount` changes.** The
error summary's focus effect was keyed on `submitCount` alone, so it ran
while the summary still did not exist and `ref.current?.focus()` was a silent
no-op. It is keyed on `submitCount` _and_ whether the summary exists. The
forms module gets away with the simpler version because its validation is
synchronous.

**Focusing the `<h1>` on arrival puts the user past the skip link.** Moving
focus on navigation is right; doing it on the first render is not, because
the browser already has focus at the top of the document. And the key check
alone was not enough: `/` redirects to `/bookmarks`, and a REPLACE
navigation has a fresh key, so a visitor typing the bare domain still landed
past the skip link. Both cases are now excluded, and both were found by a
test rather than by thinking about it.

**A mutation left in flight poisons the next test.** A favourite asserted
optimistically, with the test ending before the 120ms PATCH landed, wrote to
the mock database _after_ `afterEach` reset it. The next test started from a
state nobody wrote, passed alone, and failed in sequence.

## What the browser suite is for

jsdom cannot tell you whether the focus ring is visible, whether the skip
link is actually on screen when focused, or whether the rendered colours pass
contrast, which needs real pixels. Those three, plus the journeys that must
not break, are in `e2e/`.

One thing it deliberately does _not_ assert: that a favourite survives a
reload. The mock API keeps its data in the page's own memory, so a reload
reseeds it. The spec proves the write reached the server a different way, by
reading it back through a different query key.

## Build the image

```bash
# From the repo root: the build context is the workspace.
docker build \
  --build-arg VITE_COMMIT_SHA=$(git rev-parse --short HEAD) \
  -f projects/bookmark-manager/Dockerfile -t bookmarks:local .
docker run --rm -p 8080:8080 bookmarks:local
```

The image keeps the mock Service Worker by default, so it runs with no
backend. `--build-arg VITE_USE_MOCK=false` points it at whatever serves
`/api`.

## Not covered here

Categories, which the API has and this does not. Search. Optimistic create
with a temporary id. Infinite scroll instead of pages. Real refresh-token
rotation. Those are the obvious next things to add if you want to keep
going.
