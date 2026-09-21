# Next storefront

A small shop on the App Router. Server Components for every read, server
actions for every write, and no client-side data fetching anywhere.

The third capstone, and the one that is least like the other two.
[bookmark-manager](../bookmark-manager) fetches from a browser and caches in
a browser. [dashboard](../dashboard) draws. This one moves almost all of the
work to the server and asks what is left.

```bash
npm run dev -w projects/next-storefront     # http://localhost:5220
npm test -w projects/next-storefront        # 34 tests in Node
npm run e2e -w projects/next-storefront     # 38 tests in Chromium
npm run build -w projects/next-storefront   # read the route table it prints
```

## Read the route table

`next build` ends with this, and it is the most useful thing in the output:

```
Route (app)                          Revalidate  Expire
┌ ◐ /                                        1m      1h
├ ◐ /cart                                    1m      1h
├ ◐ /products                                1m      1h
├   /products/[slug]
│ ├ ◐ /products/walnut-desk-mat              1m      1h
│ └ ◐ [+7 more paths]
└ ◐ /search
```

`◐` means the page prerenders as static HTML and streams the parts that need
this particular request. The first build of this project printed `ƒ` on every
line, which means nothing prerenders at all, and the cause was one
`cookies()` call in the root layout. Nothing looked wrong in a browser. The
whole story is in [LESSONS.md](../../LESSONS.md).

So: read the table on every build. `ƒ` where you expected `◐` is a class of
bug no test catches.

## What runs where

| File                                                     | Runs on     | Why                                                                              |
| -------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| [`lib/catalogue.ts`](lib/catalogue.ts)                   | Server only | `import "server-only"`, so importing it from a Client Component is a build error |
| [`lib/cart.ts`](lib/cart.ts)                             | Anywhere    | Pure functions on a plain object, which is what makes the rules testable         |
| [`lib/cart-cookie.ts`](lib/cart-cookie.ts)               | Server only | The only place the cart touches a cookie                                         |
| [`app/actions.ts`](app/actions.ts)                       | Server      | `"use server"`, so every export is a public endpoint                             |
| [`components/AddToCart.tsx`](components/AddToCart.tsx)   | Client      | Holds pending state, so it has to be                                             |
| [`components/SearchForm.tsx`](components/SearchForm.tsx) | Server      | A GET form needs no JavaScript at all                                            |

The split is the point. A Client Component is not a worse Server Component,
it is a different thing with a cost: everything it imports goes to the
browser. `AddToCart` is a client island a few dozen lines long, and the
product page around it stays on the server, so the catalogue never ships.
There is a test that greps the JavaScript responses for a product blurb.

## Server actions are public endpoints

This is the part people get wrong, so it is worth saying plainly. `"use
server"` turns every export in that file into something anyone can call, with
any arguments. The fact that the only caller you wrote is a form you also
wrote means nothing.

So every action in [`app/actions.ts`](app/actions.ts) parses its input with
Zod and re-reads the product from the catalogue:

```ts
const product = await getProduct(parsed.data.slug);
if (product === null) return { ok: false, message: "That product no longer exists." };
```

The stock limit comes from that lookup, never from the form. A hidden input
saying `stock=999` takes about ten seconds to send.

The cart itself is an httpOnly cookie holding `{ slug: quantity }` and
nothing else. No prices, because a cookie is user input, and a price in one
is a price the customer chooses.

## Forms that work before JavaScript does

Every form here is a real form with a real action. `useActionState` and
`useOptimistic` are enhancements on top.

`AddToCart` uses `useActionState` for three things a plain `onSubmit` handler
does not give you: the action runs on the server, the returned state survives
the round trip, and `pending` is true for exactly as long as the request is
in flight.

`QuantityForm` uses `useOptimistic`, which shows the new number immediately
and rolls it back by itself when the action settles. A `useState` mirror of
server data makes you write that rollback by hand, and the error path is the
one you get wrong.

There is a Playwright test that runs the whole add-to-bag flow with
`javaScriptEnabled: false`, because the claim is easy to make and easy to
break.

## The gate is not the lock

`/orders` is protected twice, on purpose.

[`proxy.ts`](proxy.ts) runs at the edge, before the route, and redirects
anyone without a `session` cookie. It checks that the cookie exists. It
cannot check that it is valid, because verifying an HMAC needs
`node:crypto` and the Edge runtime has none. Importing a module that touches
crypto there fails the build, which is a quick way to find out.

So [`app/orders/page.tsx`](app/orders/page.tsx) verifies the signature
itself. A forged cookie gets past the proxy and no further, and there is a
test that sets `session=made.up` and watches it bounce.

That split is the thing to take away. The proxy is a fast gate that saves
rendering a page nobody may see. It is not the lock. A page that trusts it
and skips its own check is one routing mistake away from being open, and the
proxy does not run for a server action at all.

The other trap here is the redirect. `?next=` comes from the query string,
so `/sign-in?next=https://evil.example` is a link from your own domain that
sends people elsewhere the moment they finish signing in. Only a path is
accepted, and not `//host` either, which a browser reads as
protocol-relative.

None of this is authentication. There is no password and no user store.
Swapping in Auth.js changes [`lib/session.ts`](lib/session.ts) and nothing
else, which is why it is one file.

## A fallback is a finished page for some readers

Two pages here need the request, and they answer it differently.

`/sign-in` needs it only for `next`, so its Suspense fallback is a working
form that defaults to `/orders`. You can sign in either way; the streamed
version just remembers where you were going.

`/orders` has no static shell worth sending. Its heading is the only thing
that does not depend on who you are, and showing "Your orders" to a
signed-out visitor before redirecting them is worse than waiting. So it is
the one route in the app that blocks:

```ts
export const instant = false;
```

Both of these started as `<Suspense fallback={null}>`, which rendered an
empty page with JavaScript switched off. The swap is a `$RC()` call in a
script, so with no script the fallback is the whole page. Read every
fallback as a finished page.

## The URL is the search state

No `useState`, no client cache, no effect syncing one to the other.
[`app/search/page.tsx`](app/search/page.tsx) reads `searchParams` and renders.

A search is a link you can send, the back button does what it says, and a
reload lands on the same results. The cost is a round trip per change, which
is why the page has two nested Suspense boundaries rather than one. Reading
`searchParams` resolves almost instantly, so the form appears at once and you
can type in it. The catalogue read takes 700ms, so the results stream in
behind their own fallback.

One boundary around both would hold the form back for the slower of the two,
which is how streaming usually gets built and then does nothing.

The `key` on the inner boundary matters too. Without it React reuses the
boundary across navigations, the old results stay on screen with no fallback,
and a slow search looks like a broken one.

## Where each test runs

29 in Node, 31 in Chromium, and the line between them is sharper here than in
the other two capstones.

Node gets the pure functions: the cart rules, the filters, the money. That is
everything worth unit-testing, because everything else in this app is a
Server Component that awaits request data. There is no jsdom renderer that
can produce a `cookies()` call, and mocking one means asserting against the
mock.

Chromium gets the rest, against `next build && next start` rather than the
dev server. `next dev` renders everything on demand, so a test of ISR against
it passes whatever the caching config says. Some of those tests read the raw
response body instead of the DOM, because the claim being checked is that the
work happened on the server at all.

Two real bugs came out of the browser suite and neither was reachable from
Node: every search from the form returned zero results, and the product cards
jumped from `h1` to `h3` on two pages.

## Money is an integer number of pence

Everywhere, formatted only at the edge. `0.1 + 0.2` is
`0.30000000000000004`, and three £19.99 items in floats come to
£59.97000000000001. Nobody notices until a total disagrees with a card
statement.

## What this deliberately does not do

No database, no payment, no real auth. The catalogue is eight objects in a
module behind an artificial delay, so the streaming boundaries have something
real to wait for. Adding Postgres would add a connection pool and a migration
story and would not change a single thing about how the App Router works,
which is what this is for.
