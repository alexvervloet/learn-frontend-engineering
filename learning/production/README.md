# Production 🟢 🎭 🐳

The last module, and the one about everything that only matters once real
users load your bundle. Eight lessons: configuration, XSS and CSP, where a
token can live, error reporting, feature flags, internationalisation, the
Docker and nginx setup that serves it, and a service worker short enough to
read in one sitting.

## What the files cover

| File                           | What it teaches                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `01_env_and_config.tsx`        | `VITE_` means public. Parse at startup. Why a build cannot be promoted between environments          |
| `02_security.tsx`              | React escapes text, so the holes are `dangerouslySetInnerHTML` and a URL. A CSP that is worth having |
| `03_auth_in_the_browser.tsx`   | Four storages, four trades, and the one XSS genuinely cannot read                                    |
| `04_errors_and_monitoring.tsx` | What a boundary does _not_ catch. `sourcemap: "hidden"`. Scrubbing before you send                   |
| `05_feature_flags.tsx`         | Deterministic buckets, a chosen default when the service is down, and a removal date                 |
| `06_i18n.tsx`                  | Polish has four plural forms and your ternary has two. `Intl` for everything numeric                 |
| `07_shipping.tsx`              | Two build stages and the four nginx rules that are not optional                                      |
| `08_offline.tsx`               | A PWA by hand: the caching rule, the caches you must delete, and the kill switch to keep ready       |

Supporting code: `src/lib/config.ts`, `security.ts`, `auth.ts`, `reporting.ts`,
`flags.ts`, `i18n.ts`, `offline.ts`, plus the real `Dockerfile`, `nginx.conf`,
`public/sw.js` and `public/manifest.webmanifest`.

## Run it

```bash
npm install                        # from the repo root, once
npm run dev -w learning/production
npm test -- --project production

# The service worker, in a real browser, against a production build.
npm run e2e:install -w learning/production
npm run e2e -w learning/production

# From the repo root, because the build needs the workspace.
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_COMMIT_SHA=$(git rev-parse --short HEAD) \
  -f learning/production/Dockerfile -t frontend:local .
docker run --rm -p 8080:8080 frontend:local
```

## The five things worth taking away

**`VITE_` means published.** Vite substitutes the value into the bundle at
build time. `VITE_STRIPE_SECRET_KEY` is a secret on your home page, and the
prefix is the only thing standing between you and that. There is a CI check in
`findLeakedSecrets` for the copy-paste a review misses.

**An error boundary catches render errors and nothing else.** Not event
handlers, not rejected promises, not `setTimeout`, not the server. A dashboard
showing no errors because only a boundary was installed is a dashboard lying to
you.

**Scrub before sending.** A crash report carries the URL, form state and
breadcrumbs, any of which can hold an email, a card number or a bearer token.
Keep the user _id_, because one user hitting an error a thousand times and a
thousand users hitting it once need different responses. Drop everything else.

**Bucket feature flags deterministically, and hash the flag key too.**
`Math.random()` gives a user a different experience per page load. Hashing the
user alone puts the same unlucky group in every half-finished feature.

**`index.html` must never be cached.** The hashed assets are immutable and
cached for a year; the file that points at them is not. Get it backwards and a
deploy gives a proportion of users a white screen that clears up on its own
over hours.

## What these tests can prove

Most of this module is pure functions, which is deliberate: config parsing,
sanitising, cookie auditing, event scrubbing, flag bucketing, plural selection.
All of it is testable without a DOM and all of it is where the bugs are.

The Docker and nginx lesson asserts against the **real files**, not a copy in
the prose:

```ts
const stages = [...dockerfile.matchAll(/^FROM .+ AS (\w+)/gm)].map((m) => m[1]);
expect(stages).toEqual(["build", "serve"]);

expect(nginxConf).toMatch(/location = \/index\.html[\s\S]*?no-cache/);
```

Edit the Dockerfile without editing the lesson and the tests fail. That is the
only defence against documentation that describes a setup nobody has any more.

## One thing that caught me out

`Intl.NumberFormat("pl", …)` printed `1234,56 zł` with **no thousands
separator**, where CLDR says a narrow no-break space. Intl output depends on
the ICU data the runtime was built with, so a test asserting exact formatted
output can pass locally and fail on CI, or vice versa. The test asserts the
decimal separator and the symbol position, which hold everywhere, and says why
it stops there.

## The service worker is written out rather than generated

Use `vite-plugin-pwa` in an app. It wraps Workbox, generates the precache list
from the build output, and handles revisioning, and it will produce a better
worker than `public/sw.js`.

Read the eighty lines first anyway. A service worker sits between every request
your app makes and the network, it outlives the page that installed it, and a
bad one is cached on your users' machines until they clear site data. There is
no deploy that fixes a worker nobody will fetch again, which is why the first
thing to write is the kill switch and not the caching.

The caching rule is the same one `nginx.conf` applies in lesson 07, for the
same reason: a hashed filename cannot go stale, so cache it forever; an
unhashed `index.html` points at hashed files that may already be deleted, so
never serve a cached one without trying the network first; and an API response
cached by accident is the most common service worker bug there is.

`strategyFor` and `staleCacheNames` live in `src/lib/offline.ts` as pure
functions, and `public/sw.js` mirrors them because a worker has its own bundle
and cannot import from the app. Mirrored code drifts, so a test asserts the
worker contains the same regex and the same branches.

## What the offline tests can prove, and where

jsdom has no service worker, no Cache Storage and no way to switch the network
off, so the split is sharper here than anywhere else in the repo.

**Vitest.** Which strategy each request gets, including the unhashed file that
looks like an asset and the non-GET that `cache.put` would throw on. Which
caches to delete. Whether the manifest is installable, asserted against the
real `manifest.webmanifest` rather than a copy. And that registration returns a
value for every failure mode instead of rejecting, because a 404 on the worker
file is otherwise silent.

**Chromium**, in `e2e/offline.spec.ts`, against `vite preview` of a real build:
that the worker takes control, that the shell lands in Cache Storage as a real
`Response`, that the app comes back with `context.setOffline(true)`, that an
API call still fails rather than being served stale, and that a previous
version's caches are gone after activate.

That last one is also where a fact worth knowing turned up. The obvious way to
write it is to install, plant a `shell-v0` cache, then call
`registration.update()`. It does not work: `sw.js` is byte-identical, so the
browser finds no new worker, nothing installs, and `activate` never runs again.
A service worker only re-activates when its bytes change, which means a
`VERSION` constant nobody bumps is a cleanup that never happens.

## Not covered here

CDN configuration and cache invalidation at the edge, blue-green and canary
deploys, secret management in CI, SRI hashes for third-party scripts, rate
limiting, cookie consent and the analytics that need it, load testing,
background sync and push notifications, and Workbox itself. Most of those live
on the infrastructure side of the line this repo draws.
