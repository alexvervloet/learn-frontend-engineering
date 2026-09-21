# Lessons

Things that did not go the way the plan assumed, written down when they happened.
Each entry says what was expected, what actually happened, and what to do next
time.

## The newest TypeScript is not the one this repo can use

**Expected.** TypeScript 7.0.2 is the current release (the Go rewrite, roughly
10x faster than `tsc` 5.x), so the repo would use it, as the backend repo does.

**What happened.** `npm install` failed on a peer conflict:

```
peer typescript@">=4.8.4 <6.1.0" from typescript-eslint@8.70.0
```

typescript-eslint has not shipped TypeScript 7 support, on `latest` or on
`canary` (`8.70.1-alpha.25` caps at the same range). typescript-eslint is not
optional here: it supplies the _parser_. Without it ESLint cannot read a `.ts`
or `.tsx` file at all, so dropping it means no linting of any kind, not just
losing the type-aware rules.

**The call.** Pin TypeScript 5.9.3 and keep ESLint. React's lint story runs
entirely through ESLint right now — `eslint-plugin-react-hooks` ships the React
Compiler check, and Next.js's own config is ESLint-based — so a React curriculum
that cannot lint is worse than one a minor version behind on the compiler. The
language a learner writes is identical between 5.9 and 7; the difference is
compile speed.

**Next time.** Before pinning a toolchain version, check the peer ranges of the
things that have to consume it, not just the registry's `latest`. `npm view
<pkg> peerDependencies` answers it in one call. Revisit when typescript-eslint
widens the range.

## npm 11 does not run install scripts any more

**Expected.** `npm install` would leave a working tree.

**What happened.** It finished, then warned:

```
npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
```

esbuild's `postinstall` is what downloads its platform binary. Blocked, esbuild
is installed but cannot run, and every Vite command dies later with a confusing
error a long way from the actual cause.

**The fix.** `npm install-scripts approve esbuild` (and `fsevents`, for file
watching on macOS). That writes an `allowScripts` block into `package.json`
keyed by exact version:

```json
"allowScripts": {
  "esbuild@0.28.2": true,
  "fsevents@2.3.3": true
}
```

**Next time.** Read the tail of `npm install` rather than trusting the exit code.
The version keys mean a dependency bump re-blocks the script, so expect this
again after an upgrade — that is the feature working, not a bug.

## eslint-plugin-jsx-a11y trails ESLint by a major version

**Expected.** The a11y rules would install alongside ESLint 10.

**What happened.** `eslint-plugin-jsx-a11y@6.10.2` still declares
`peer eslint@"^3 || … || ^9"`. It has had no release since ESLint 10.

**The fix.** An npm `overrides` entry, because the plugin works fine on flat
config and only the declared range is stale:

```json
"overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }
```

**Next time.** A stale peer range is worth overriding when the plugin's actual
API surface did not change. A stale _engine_ or a real API break is not. Check
the plugin's changelog before reaching for `overrides`, and never use
`--legacy-peer-deps`, which turns the check off repo-wide instead of for the one
package that needs it.

## Testing Suspense: `render` poisons the act scope

**Expected.** Render a component that suspends, then
`await screen.findByTestId("bio")`. Testing Library polls until the promise
resolves and the content appears.

**What happened.** The fallback stayed on screen for the full two-second timeout
and the test failed with "Unable to find an element". stderr had the real cause,
one line buried above the failure:

```
A component suspended inside an `act` scope, but the `act` call was not awaited.
```

Testing Library's `render` does its work inside a _synchronous_ `act`. A
component that suspends inside one of those is never retried, so `findBy` polls
a tree React has deliberately decided not to touch.

Four things did not fix it: waiting longer, switching the promise from a timer
to a microtask, fake timers with `advanceTimersByTimeAsync`, and an empty
`await act(async () => {})` after the wait. Rendering with `createRoot` directly,
no Testing Library, worked first time, which is what identified `render` as the
culprit.

**The fix.** Give `render` its own awaited `act`, and the waiting a second one.
They have to be separate calls: doing both inside one act re-renders the
component but never commits.

```ts
await act(async () => {
  render(<SuspenseAndUse />);
});
await act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
});
```

Any later interaction that suspends again (a click that loads new data) needs
the same wrapper.

**Next time.** When an async React test hangs, read stderr before touching the
timeout. React's act warnings say exactly what is wrong and are easy to scroll
past, because the assertion failure underneath them looks like the real error.

## Fake timers and user-event deadlock each other

**Expected.** `vi.useFakeTimers()` plus
`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, which is the
documented pairing.

**What happened.** The first `await user.click(...)` never resolved. The test
died on Vitest's five-second timeout with no indication of which line was stuck.

user-event awaits its own timers between keystrokes and clicks. With the clock
frozen, nothing advances it, and `advanceTimers` is never reached because the
call that would reach it is the one waiting.

**The fix.** `vi.useFakeTimers({ shouldAdvanceTime: true })`. The clock still
moves in real time, so user-event's waits resolve, and `advanceTimersByTime`
still jumps ahead on demand.

**Next time.** A test that times out with no assertion failure is usually a
deadlock, not slowness. Raising the timeout confirms it and fixes nothing.

## Lint plugins have not all finished the flat-config move

**Expected.** `reactHooks.configs.recommended` in an ESLint flat config array.

**What happened.** ESLint refused to start:

```
A config object has a "plugins" key defined as an array of strings.
```

In `eslint-plugin-react-hooks@7`, `configs.recommended` and
`configs["recommended-latest"]` are still the eslintrc shape. The flat versions
are one level down, under `configs.flat`.

**The fix.** `reactHooks.configs.flat["recommended-latest"]`, which is also the
one that carries the React Compiler rules.

Those rules then failed the build on three lessons, correctly:
`react-hooks/refs` on a render-counting hook, and `react-hooks/set-state-in-effect`
on the deliberately wrong half of the "you might not need an effect" lesson.
Both are now disabled on the specific line with a comment saying the rule is
right and the lesson is showing what it forbids. Silencing a rule is fine when
you can say why in a sentence. Turning it off repo-wide is not.

**Next time.** `node -e "import('eslint-plugin-x').then(m => console.log(Object.keys(m.default.configs)))"`
answers "which of these is the flat one" faster than reading the changelog.

## Prettier moves `@ts-expect-error` onto the wrong line

**Expected.** A directive above an assertion applies to that assertion.

```tsx
// @ts-expect-error an h4 has no href
assertType(
  <Text as="h4" href="/x">
    heading
  </Text>,
);
```

**What happened.** `npm run format` reflowed the JSX across five lines, leaving
the directive sitting above `assertType(`. That line contains no error, so the
type test failed with "Unused '@ts-expect-error' directive" _and_ the real error
underneath it went unsuppressed. Two failures from one reformat, and the
assertion had silently stopped testing what it claimed.

**The fix.** Pin the directive to the thing it is about, not to the statement:

```tsx
assertType(
  <Text
    as="h4"
    // @ts-expect-error an h4 has no href
    href="/x"
  >
    heading
  </Text>,
);
```

**Next time.** Run the formatter _before_ trusting a type test, not after. Any
`@ts-expect-error` above a call that a formatter might reflow is a line-number
dependency waiting to break, and the failure mode is the assertion quietly
passing rather than an obvious error.

## Type tests need two lint rules switched off, and it is worth understanding why

**What happened.** `npm run lint` failed on the `.test-d.tsx` files with
`@typescript-eslint/no-unused-expressions`. The offending lines look like
mistakes:

```tsx
// @ts-expect-error `typo` is not one of the two keys
withSatisfies.typo;
```

They are not. In a type test the bare expression _is_ the assertion: it says
"reading this property is an error", and there is nothing to assign it to.

The second was `react-refresh/only-export-components`, which fires on any lesson
file exporting a pure helper next to its component. That is deliberate in every
lesson here, because a reducer or parser you can test without a DOM is worth more
than hot reload on a file nobody is editing.

**The fix.** Both are now `files`-scoped overrides in `eslint.config.js` rather
than disable comments repeated in a dozen files, and the per-file comments that
were in react-core are gone. A rule you exempt in one place with a reason is
maintainable. The same comment pasted into every new lesson is not.

**Next time.** Two or three identical disable comments is the signal to move it
into the config. Before that, the comment is more honest.

## `?raw` on a CSS file returns an empty string under Vitest

**Expected.** `import tailwindCss from "../tailwind.css?raw"` gives the file's
contents, so a test can assert what the stylesheet declares.

**What happened.** It gave `""`. Vitest skips CSS by default, and
`learning/styling` only opts `.module.css` back in, so everything else is
stubbed before `?raw` is honoured.

The bad part is not the empty string. It is that **every assertion still
passed** while it was being developed against a truthy expectation, and would
have gone on passing forever:

```ts
expect(tailwindCss).not.toContain("preflight"); // passes on ""
```

Only the assertions that expected content to be _present_ failed, which is what
gave it away. An assertion suite that reads a file can be entirely vacuous and
look green.

**The fix.** `readFileSync(join(import.meta.dirname, "..", "tailwind.css"))`.
`import.meta.dirname` works fine under Vitest; an earlier attempt with
`fileURLToPath(new URL(…, import.meta.url))` threw "The URL must be of scheme
file" and was not worth chasing.

**Next time.** When a test reads an external file, assert something is present
before asserting anything is absent. A single `expect(contents.length).toBeGreaterThan(0)`
would have caught this in seconds.

## A substring check matched the comment explaining it

**What happened.** `expect(tailwindCss).not.toContain("preflight")` failed,
because the file contains three paragraphs explaining _why_ preflight is left
out.

**The fix.** Assert the syntax, not the word:

```ts
expect(tailwindCss).not.toMatch(/@import\s+"tailwindcss\/preflight/);
expect(tailwindCss).not.toMatch(/@import\s+"tailwindcss";/);
```

The second line matters independently: `@import "tailwindcss"` pulls preflight
in as well, so checking only for the explicit path would miss it.

**Next time.** Any test that greps a source file is also grepping its comments.
In a repo whose files are mostly comments on purpose, match on structure.

## jsdom is missing three browser APIs, and each one costs a confused half hour

**What happened.** `ResizeObserver is not defined` in `learning/styling`, having
already hit and fixed the same thing in `learning/typescript-react` a day
earlier. `matchMedia` and `IntersectionObserver` are equally absent.

**The fix.** All three are now stubbed once in `config/vitest.setup.ts` rather
than per module. They are deliberately inert: jsdom does no layout, so there are
no size changes, intersections or media matches to report, and a stub that
returned plausible numbers would let a test assert something no browser would
do.

The exception proves the rule. `useReducedMotion` genuinely needs a media query
that changes, so `learning/styling` has `createMatchMediaStub`, which a test
overrides the global with and can flip mid-test to cover the `change` listener.

**Next time.** The second time a stub is needed, it belongs in shared setup.
The first time, it belongs next to the test that needs it.

## A `ref` is null in React Hook Form's error callback

**Expected.** `handleSubmit(onValid, onInvalid)` gives you an `onInvalid`
callback for a failed submit, so focusing the error summary belongs there:

```tsx
handleSubmit(onValid, () => summaryRef.current?.focus());
```

**What happened.** Nothing. No error, no warning. The errors rendered, the
summary appeared, and focus stayed on the submit button.

`onInvalid` runs _before_ React has re-rendered with the errors, so the summary
element does not exist yet and the ref is still null. `?.focus()` on null is a
silent no-op, which is the worst possible failure mode: the code reads
correctly and does nothing.

For a keyboard or screen reader user this is not cosmetic. They press the
button, are told nothing, and have to hunt for what went wrong.

**The fix.** An effect keyed on `submitCount`, which changes on every submit
attempt and therefore fires after the render that created the summary:

```tsx
useEffect(() => {
  if (submitCount === 0) return;
  summaryRef.current?.focus();
}, [submitCount]);
```

**Next time.** Any DOM operation on something that is about to be rendered
belongs in an effect, not in the callback that caused the render. And a
focus-management assertion belongs in the test: `expect(summary).toHaveFocus()`
is what caught this.

## The render count was one, not zero, and the one was the lesson

**Expected.** React Hook Form keeps values in the DOM, so typing causes no
re-renders. The test asserted zero for fifteen keystrokes.

**What happened.** One. The form reads `formState.isDirty` to show an
unsaved-changes note, and `formState` is a Proxy: reading a property subscribes
the component to it. `isDirty` flips false → true on the first keystroke, and
that is one render. Every keystroke after it is free.

**The call.** Keep the subscription and assert the real number, with a second
test proving the subsequent keystrokes cost nothing. Deleting the note to make
the number zero would have made a tidier claim and a less true one.

**Next time.** When a measured number disagrees with the story, check whether
the number is telling you something first. `formState` being a Proxy is
documented behaviour and worth teaching; the round figure was not worth
protecting.

## A test passed because a number input ate the minus sign

**Expected.** Typing `-5` into a quantity field would exercise the
`Math.max(0, …)` clamp inside the Jotai write atom.

**What happened.** The test passed, asserting the value was not negative. But
`<input type="number">` silently drops a leading minus in jsdom, so the field
received `5`, the clamp never ran, and the assertion was about nothing.

It only came to light while writing the comment explaining what the test
proved, and finding that it did not prove it.

**The fix.** Drive the atom directly and assert `0`, with a separate, honest
test that the input is wired to the atom at all.

**Next time.** A passing test that goes through a form control is testing the
control as much as the code. When the assertion is about a boundary condition,
call the function.

## @vitejs/plugin-react 6 does not use Babel any more

**Expected.** Enable the React Compiler the documented way:

```ts
react({ babel: { plugins: [["babel-plugin-react-compiler", { target: "19" }]] } });
```

**What happened.** The build succeeded, nothing warned, and no component was
compiled. Plugin-react 6 transforms with **oxc**, not Babel, so there is no
`babel` option and the whole object was silently ignored. Every instruction
written before that release is now wrong in a way that produces no error.

**The fix.** A flag, plus a separate package:

```bash
npm i -D oxc-transform-react
```

```ts
react({ compiler: true });
```

**Next time.** When a build-time transform "does not seem to do anything",
look at the output rather than the config. A compiled component starts with
`const $ = _c(n)`, so `expect(Probe.toString()).toContain("_c(")` settles it in
one test. An option a tool does not recognise is usually not an error.

## A statically prerendered page does not stream

**Expected.** A Next route with a `<Suspense>` around a 700ms query would send
the shell first and the slow part later, and a Playwright test could assert
the fallback was visible.

**What happened.** The fallback never appeared, because the page had no
request-specific input and Next had prerendered it at build time. The 700ms
happened once, during the build, and every visitor got a finished HTML file.
The test was asserting something no user would ever see.

**The fix.** `export const dynamic = "force-dynamic"` for the lesson, with a
note that a real app makes a page dynamic by reading `cookies()`,
`headers()` or `searchParams` instead. The build output says which is which:

```
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Next time.** Read the route table after a Next build. If a page you expected
to stream is marked ○, it is not streaming, and it does not need to.

## Streamed content needs JavaScript to appear

**Expected.** Streaming is progressive enhancement, so a Suspense boundary's
content would render for a client with scripting disabled.

**What happened.** The test failed, correctly. React sends the fallback where
the boundary is, the real markup further down inside a `hidden` container, and
a tiny inline `$RC(…)` script that swaps them. No script, no swap.

So the content _is_ in the HTML, and a crawler that parses the response finds
it, while a person with scripting off sees the fallback forever.

**The rule.** Anything that must render without JavaScript belongs in the
shell, outside every Suspense boundary.

**Next time.** "Works without JavaScript" is three different claims: the
markup is in the response, the page is readable, and the page is usable.
Streaming satisfies the first and not always the second.

## Two preview servers, two different traps

**`astro preview` daemonises.** It forks, prints a pid, and the foreground
process exits, so Playwright reports "Process from config.webServer exited
early" while the server runs perfectly well on the port. There is a
`--background` flag and no `--foreground` one. Astro's output is static files,
so the config uses `vite preview` instead.

**A plain static server does not guess trailing slashes.** Astro writes
`dist/static/index.html`, and its own preview server serves that for `/static`
as well as `/static/`. `vite preview` falls through to the SPA fallback and
returns the **index page with a 200**, so twelve tests failed while asserting
against the wrong document, each one reporting that some element was missing.

`trailingSlash: "always"` makes the contract explicit. Worth setting for any
static host rather than depending on one server's redirect behaviour.

**Next time.** A 200 is not a match. When a test says an element is missing
from a page that obviously has it, print the response body before touching the
selector.

## A missing .dockerignore uploaded 817MB before the build started

**Expected.** `docker build -f learning/production/Dockerfile .` from the repo
root would take a minute or two.

**What happened.** Ten minutes with no output at all, and it was killed. The
build context is everything in the directory and Docker sends all of it to the
daemon _before the first instruction runs_. For this monorepo that is 817MB,
almost all of it `node_modules`.

**The fix.** A `.dockerignore` at the repo root. The Dockerfile installs from
the lockfile anyway, so sending `node_modules` is worse than pointless: a
host's copy can contain binaries built for the wrong platform.

**Next time.** Write the `.dockerignore` before the Dockerfile. And note that
no progress output is a symptom in itself: Docker streams each step, so
silence means it has not reached step one.

## Intl output depends on the runtime's ICU data

**Expected.** `Intl.NumberFormat("pl", { style: "currency", currency: "PLN" })`
formatting 1234.56 as `1 234,56 zł`, which is what CLDR specifies.

**What happened.** `1234,56 zł`, with no thousands separator at all, on Node
24 locally.

Intl results depend on the ICU data the runtime was built with, so exact
formatted output can differ between your machine, CI and a user's browser. A
snapshot of a formatted number is a test that fails somewhere else.

**The fix.** Assert the things that hold everywhere: the decimal separator,
the currency symbol's position, the relative-time wording. The test says
explicitly why it stops short of the separator.

**Next time.** Treat formatted output like a date format. Assert the parts you
control, not the whole string.

## The canonical hydration-mismatch example makes a flaky test

**Expected.** A component rendering `Date.now()` produces different output on
the server and on the client, so `hydrateRoot` reports a mismatch. That is the
example in every article about hydration, including the one in this repo.

**What happened.** The test passed when written, passed in CI for a week, and
then failed about one run in three on a quiet machine.

On a fast machine `renderToString` and `hydrateRoot` run in the **same
millisecond**. `Date.now()` returns the same number twice, the two renders
agree, and there is no mismatch to report. The test was not asserting about
timing at all, so the failure read as "React stopped reporting mismatches",
which sent me looking in the wrong place.

**The fix.** A module-level counter that increments on every render. It is the
same impurity, it differs every time, and the component's docblock says
plainly that it stands in for `Date.now()` and why the clock is not used.

**Next time.** Anything derived from the wall clock in a test is a race with
the machine it runs on. If a test needs two values to differ, make them
differ; do not rely on time passing between them. And a test that passes in CI
is not a test that is deterministic, it is a test that has not lost yet.

## Chowning your way to a non-root nginx does not work

**Expected.** The official `nginx:alpine` image runs as root, and a container
serving static files should not. Create a user, chown `/var/cache/nginx`,
`/var/run` and `/var/log/nginx`, add `USER web`, done.

**What happened.** The image built. The container started and exited
immediately, so the smoke test got one "Connection reset by peer" followed by
twenty-nine "Couldn't connect to server" and no clue why. The entrypoint
scripts and the default config expect root in more places than those three
directories, and finding them one at a time is a losing game.

**The fix.** `nginxinc/nginx-unprivileged`. The same nginx, built for this:
runs as uid 101, listens on 8080 rather than 80, needs no chown at all.

**Next time.** When hardening means fighting an image's assumptions, look for
the variant built with those assumptions changed. And always print
`docker logs` when a container fails a health check: the first version of the
CI step did not, which is why the failure said nothing.

## nginx `add_header` does not merge across levels

**Expected.** A `Content-Security-Policy` in the `server` block applies to
every response from that server.

**What happened.** It applied to most of them. A location block that declares
**any** `add_header` of its own discards _every_ `add_header` inherited from
its parent, and both cache-control locations declare one:

```nginx
location = /index.html {
  add_header Cache-Control "no-cache, must-revalidate";   # drops the CSP
}
```

So `index.html`, the one response anybody would inspect, was served with a
200, correct markup, a working deep-link fallback, and no CSP at all.

**The fix.** The headers live in `nginx-security-headers.conf`, and every
location that sets a header of its own `include`s it again. There is a test
that walks the location blocks and asserts exactly that.

**Next time.** nginx directive inheritance is per-directive and not
intuitive: `add_header` replaces, `proxy_set_header` replaces,
`try_files` does not inherit at all. Assume replacement and verify with
`curl -I` against the running container.

**And the wider point.** Both of these were found by CI building the image and
curling it, not by the twenty tests asserting what the Dockerfile and
`nginx.conf` _say_. Those tests are worth having, and they cannot tell you
whether the thing runs.

## A "nice" axis top does not give you nice ticks

**What I expected.** `niceExtent` rounds the maximum up to a round number, so
dividing that range into four gives four round ticks.

**What happened.** `niceExtent([4100])` returns a max of 6000, which is round.
Dividing it into four gives ticks at 0, 1500, 3000, 4500, 6000. The axis top is
round and three of the five labels are not, which is the exact thing the
function exists to prevent. The test that caught it asserted the max and
happened to disagree for an unrelated reason, so I only looked at the ticks
because I was already in there.

**The fix.** Pick the round step first and let the tick count fall out of it,
rather than fixing the count and dividing. `step` is now part of `Extent`, and
`ticks` reads it instead of recomputing anything:

```ts
export function ticks(extent: Extent): number[] {
  const count = Math.round((extent.max - extent.min) / extent.step);
  return Array.from({ length: count + 1 }, (_, i) => extent.min + i * extent.step);
}
```

`tickCount` stays an argument to `niceExtent`, but it is a hint for choosing
the step, not a promise about how many ticks come back.

**Next time.** Assert the property, not an example. The replacement test walks
five different inputs and checks that every tick has at most two significant
digits, which is what "nice" actually means. The old test checked one number
against one other number, and a number can be right for the wrong reason.

**The second half of the same test.** `formatCompact(1500)` returned `"1.5k"`
where I expected `"1.5K"`. Lowercase is correct for `en-GB`, so the assertion
was wrong, not the code. I uppercase the suffix by hand now because it reads
better on an axis, which also removes the dependency on whatever ICU data the
runtime ships. That is the second time this repo has been bitten by assuming
`Intl` output.

## A virtualiser in jsdom renders nothing, and the test suite says fine

**What I expected.** Render the virtualised table in jsdom, assert on the rows.

**What happened.** No rows. jsdom does no layout, so the scroll element
measures zero pixels tall, and a virtualiser told the viewport is 0px high is
correct to render nothing. Six assertions about rows were green because
`getAllByRole("row")` found the header and nothing else, and three failed only
because I had indexed past it. A file full of `expect(rows.length).toBeLessThan(500)`
would have passed forever against an empty grid.

**Two wrong turns before the fix.**

`initialRect: { width: 960, height: 420 }` looked like the option for exactly
this. It is not. `observeElementRect` calls its handler synchronously on mount
before any observer fires, so the measured zero overwrites the initial value
immediately.

Then I stubbed `HTMLElement.prototype.getBoundingClientRect`, which changed
nothing, because virtual-core measures with `offsetWidth`/`offsetHeight`:

```js
const getRect = (element) => {
  const { offsetWidth, offsetHeight } = element;
  return { width: offsetWidth, height: offsetHeight };
};
```

**The fix.** Redefine `offsetWidth` and `offsetHeight` on
`HTMLElement.prototype` for the duration of the file, returning a real size
for the scroller and 0 for everything else, and restore the original
descriptors in `afterAll`.

**What the stub is and is not worth.** It gets you the component's index
arithmetic, its ARIA, and its key handling, all of which are the component's
own logic. It cannot tell you how many rows a browser paints, because the
number now comes from a constant I chose. That assertion belongs in Playwright
against a real box, and it is there.

**The bug this found.** With rows finally rendering, the roving-focus test
failed for a second reason: the grid keeps DOM focus and marks the active row
with `aria-selected`, but never set `aria-activedescendant`. Arrow keys moved a
highlight that a screen reader was never told about. Rows now carry a `useId`
prefixed id and the grid points at the active one.

**Next time.** Before writing assertions against a component that measures
itself, render it once and print the DOM. Green on an empty tree is the
quietest failure there is.

## A wrapper's custom properties do not reach the body that reads them

**What I expected.** The dashboard's colour tokens live on `.viz-root`, both
themes were run through the validator, and both passed. Dark mode looked
right in the wrapper.

**What happened.** axe reported white-ish text at 1.13:1 in dark mode:
`#0b0b0b` on `#1a1a19`. Every token was correct. The problem is that
`.viz-root` is a div inside `body`, and `body` reads the tokens itself:

```css
body {
  color: var(--text-primary, #0b0b0b);
}
```

`body` is outside the scope that defines them, so it took the fallback, the
light ink, and everything inside inherited it. The wrapper's own computed
values were right the whole time, which is why reading the file did not show
it.

**The fix.** Declare the tokens on `:root` as well as `.viz-root`, in all
three blocks.

**Two more things the same axe run found.** White on `--series-direct`
measures 4.41:1, just under the 4.5 axe wants at 14px, so the pressed
range button now uses its own `--accent` / `--accent-ink` pair. A series hue
was the wrong thing to reach for anyway: it made the button look like a
fourth line on the chart.

And `scrollable-region-focusable`, twice. The two cases wanted opposite
fixes. The event grid already had `tabIndex={0}` and its own key handling, so
the answer was to make _it_ the scroll container instead of nesting a
scrolling div inside it, which removed the extra region rather than adding a
second tab stop inside one widget. The chart's table view is a plain table
with nothing to handle, so there the standard `tabIndex={0}` plus a label is
right.

**Where the rules disagree.** jsx-a11y's `no-noninteractive-tabindex` flags
exactly the tabIndex that axe demands. Both are right about their own
concern, and neither can see the other. I let the browser audit win and
configured `roles: ["region", "tabpanel"]` on the lint rule, with the reason
written next to it.

**Next time.** Validating a palette is necessary and does not tell you the
palette is applied. Run axe against the rendered page in both schemes. Three
real defects here, none of them visible in the CSS.

## A green local run does not mean the commit is green

**What happened.** I ran typecheck, lint and build at the repo root, got three
passes, and pushed. The push contained a dashboard that could not build,
because eleven of its files, including `package.json`, `vite.config.ts` and
`index.html`, had never been staged. I had been committing in small
deliberate chunks and staged each one by name, which is right, and simply
never wrote the commit for the scaffold.

Everything passed locally because the files were sitting in my working tree.
`git status` was in the same output as the push and I read past it.

**The fix.** A second push, ten commits later, with the scaffold in it. The
broken commit is still on main. I did not rewrite public history for it.

**Next time.** Check `git status` before the push, not in the same breath as
it, and treat a non-empty untracked list as a blocker rather than noise. The
stronger version is to verify from the index instead of the working tree,
`git stash -u && npm run build`, which is what the CI runner effectively
does.

**This is the second time staging has been the problem**, in the opposite
direction: on the bookmark-manager I ran `git add -A` before a staged-commit
sequence and landed 54 files in one commit. Committing by name is still
right. The gap is the check afterwards, not the method.

## One cookie read in the root layout made every route dynamic

**What I expected.** The storefront's root layout reads the cart cookie so
the bag count is right in the first HTML response, and the product pages
below it prerender with `export const revalidate = 60`. I wrote a comment in
the layout saying exactly that.

**What happened.** The first build printed seven routes and every one of them
was `ƒ`, server-rendered on demand. Including the product pages whose only
job in this project is to demonstrate ISR. In the classic model a single
`cookies()` call anywhere in a tree opts the whole tree out of static
rendering, and it does it silently. My comment was confidently wrong and the
build output was two lines below it.

**The fix, in three steps, each of which failed differently.**

Turning on `cacheComponents` broke the build: `Route segment config
"revalidate" is not compatible with nextConfig.cacheComponents`. Caching has
moved from a per-route export to a per-function one. `export const
revalidate = 60` on the page becomes `"use cache"` plus
`cacheLife("minutes")` inside the data function, where the arguments are the
cache key.

Then the build refused `/cart`:

```
Error: Route "/cart": Next.js encountered uncached or runtime data during prerendering.
`cookies()` ... accessed outside of <Suspense> prevents the route from being prerendered
```

This is the good change. The old model let you make every page dynamic by
accident and said nothing; this one will not build until the request-specific
part is behind a boundary. `/cart` and `/search` both needed splitting into a
static shell and an async child.

Last, the bag count moved out of the layout into its own component inside a
Suspense boundary in `BagLink`, with a same-size fallback pill so the header
does not jump.

Now all seven routes are `◐`, and the eight product pages are prerendered
individually with a 1m revalidate.

**Next time.** Read the route table at the end of every Next build. `ƒ` where
you expected `◐` or `○` is a whole class of bug that no test catches and no
page looks wrong because of. And with `cacheComponents` on, splitting a page
into a static shell and a streamed child is not an optimisation you get to
postpone. The build makes you do it.

## Every search from the form returned nothing, and only a browser found it

**What happened.** The storefront's search page reads its filters from the
query string and the form is a plain GET form. Typing `/search?q=lamp` by
hand worked. Typing "lamp" into the form and pressing Search returned
"Nothing matched", every time, for every query.

**Why.** A GET form submits every field it has, including the ones left
alone. Choosing "Any" in the category select sends `category=`, an empty
string, and the filter read it as a value:

```ts
if (filters.category !== undefined && product.category !== filters.category) return false;
```

Nothing has a category of `""`, so nothing matched. The unit tests for
`applyFilters` all passed, because every one of them either set a real
category or left the key off entirely. I never wrote `{ category: "" }`,
because by hand you never produce it.

**The fix.** Normalise an empty string to `undefined` when reading the
params, and guard in `applyFilters` as well. There is now a unit test for
`{ category: "" }`, which is the case the browser actually generates.

**Next time.** When a form feeds a parser, write the test from what the form
sends, not from what the parser looks like it wants. `new
FormData(form)` in a console is a faster way to find out than reasoning.

**The other thing this run found.** `heading-order`. `ProductCard` hard-coded
an `h3`, which nests correctly on the home page, where an `h2` sits above the
grid, and jumps h1-to-h3 on `/products` and `/search`, which have no `h2`. A
card does not know where it sits, so the level is a prop now.

**And a test bug of mine.** One a11y test clicked "add to bag" and navigated
immediately. `page.goto` cancels the action still in flight, and the cart
renders empty. It passed roughly one run in five, which is the worst
frequency: often enough to look fine locally, rare enough to fail in CI. Wait
for the effect, not for the click.

## A timing test that passed for weeks measured the CI runner

**What happened.** The performance module's first lesson renders a
deliberately expensive subtree next to a cheap one and asserts the Profiler
reports the expensive one as slower. On my machine the gap is twentyfold. In
CI, on Node 26, it failed:

```
AssertionError: expected 3.5426030000003266 to be greater than 3.8751170000000457
```

3.54ms against 3.88ms. The real numbers are about 1.9ms and 0.08ms. Both CI
figures were the shared runner: four Vitest workers competing for cores, and
a single `render()` catching whichever one got descheduled.

**The fix.** Render five times, keep the fastest of each, and require a
twofold margin. Noise only ever adds time, so the minimum of several runs is
the closest estimate of the real cost, and the mean is the one statistic
guaranteed to be contaminated. A twofold margin cannot be closed by
scheduling noise, and if the real gap ever narrows that far the lesson it
teaches is wrong anyway.

**Next time.** Never assert on one timing sample, and never use the mean.
Also: this is a module about measuring, and its own test was measuring badly.
Worth checking that the tests for a lesson practise what the lesson says.

**Separately**, the same CI run failed `format:check` on LESSONS.md, this
file, because Prettier reflows the prose. I had been running `lint` and
`typecheck` locally and not `format:check`. All three now, before every push.

## A Suspense fallback is the whole page for a visitor without JavaScript

**What I expected.** Wrap the request-dependent part of a page in
`<Suspense>`, give it a `null` fallback because there is nothing useful to
show yet, and let the real content stream in.

**What happened.** `/sign-in` rendered an empty page with JavaScript off, and
`/orders` rendered the word "Checking…" and stopped. Both were fine in a
normal browser, so nothing looked broken until a Playwright test ran with
`javaScriptEnabled: false`.

**Why.** The swap is a `$RC()` call in a `<script>`. The streamed content
arrives in a `<div hidden>` and that script moves it into place. No script,
no move. Whatever is in the fallback is the final state of the page.

This repo already had a lesson about that hidden container. I knew the
mechanism and still wrote a `null` fallback, because I was thinking about
what the fallback looks like for a second rather than what it is for
somebody who never gets past it.

**Two fixes, because the two pages wanted different answers.**

`/sign-in` only needs the request for the `next` parameter, so its fallback
is a working form that defaults to `/orders`. Signed in either way; the
streamed version just remembers where you were going.

`/orders` has no static shell at all. Its heading is the only thing that does
not depend on who you are, and showing "Your orders" to a signed-out visitor
before redirecting them is worse than waiting. So it is the one blocking
route in the app:

```ts
export const instant = false;
```

That export is what `cacheComponents` offers when the honest answer is that
nothing can be prerendered, and the build names it in the error it throws.

**Next time.** Write the no-JavaScript test before the fallback, not after.
And read every fallback as a finished page, because for some readers it is
one.

**A locator note.** Making the fallback a real form puts two identical forms
in the DOM once the stream lands, one inert inside `[hidden]`. Playwright's
strict mode refuses to pick. The tests use `:visible`. That is now the third
time React's hidden streaming container has broken a test in this repo, so:
when a Playwright locator suddenly matches two of something on a streamed
page, it is the template, not a duplicate render.

**And a rename.** Next 16 deprecated `middleware.ts` in favour of `proxy.ts`
with an exported `proxy`. The old name still builds and warns.

**And the Edge runtime is not Node.** `proxy.ts` imported `SESSION_COOKIE`
from the module that also signs the cookie, which dragged `node:crypto` into
a runtime that has none and failed the build. The constant moved to a module
that imports nothing. The failure is the same boundary the proxy's own
comment is about: it can route, it cannot verify.

## A cleanup test that passed with the cleanup deleted

**Expected.** `web-fundamentals` lesson 01 is about event delegation and the
teardown contract, and it has a test called "stops responding once unmounted".
Deleting the `removeEventListener` calls should fail it.

**What happened.** It did not. The test asserted `root.innerHTML === ""` and
nothing else, and every listener in the lesson was attached to a node _inside_
`root`. The teardown's last line is `root.innerHTML = ""`, which detaches those
nodes, and an unreachable node's listeners are unreachable with it. The
`removeEventListener` calls the whole lesson was written to teach were doing
nothing at all.

Worse than a weak test: the lesson taught the wrong instinct. "Always remove
your listeners or you leak" is true for the case it did not show and false for
the case it did.

**The call.** Add a `keydown` handler on `document`, which is the case that
does leak: `document` outlives the teardown, so the listener stays, its closure
keeps the old list and counters alive, and a second mount stacks another one
beside it. The lesson's header now separates the two cases explicitly.

Testing it took a second attempt. A leaked handler clears a list nobody can see
any more, so every user-facing assertion still passed. The test keeps a
reference to the first mount's `<ul>` — detached after unmount, but still a
live node that a leaked closure would still be holding — puts a row into it,
and checks the row survives the shortcut.

**Next time.** For any test named "stops doing X", write it by deleting the
code that stops X and watching it fail. A test that passes against both
versions of the code is measuring something else. The same check caught a
Storybook `play` function in `learning/testing` that asserted its own initial
render, and a `safeNext` test in `projects/next-storefront` that had
reimplemented the function it was supposed to be guarding.

## A URL is a grammar, and a string check is a guess at it

**Expected.** `projects/next-storefront` guards its post-sign-in redirect with
`value.startsWith("/") && !value.startsWith("//")`. Reject absolute URLs,
reject protocol-relative ones, done.

**What happened.** `/\evil.example` passes that check, and every browser
resolves it to `https://evil.example/`. Backslash is a path separator for
special schemes, so `/\` is `//` by the time the address bar sees it. Confirmed
end to end against `next build && next start` with a real browser: signing in
from `/sign-in?next=/\evil.example/p` landed on the attacker's page.

`/<tab>/evil.example` and `/<newline>/evil.example` get there the same way,
because tab, carriage return and newline are stripped before the URL is parsed.

The e2e test covered `https://` and `//` and passed throughout.

**The call.** Stop reading URLs as strings. Resolve against a sentinel origin
with `new URL(value, "https://next.invalid")` and compare `origin`, then return
the parser's own `pathname + search + hash` rather than the string that
arrived. Using the same parser the browser uses is the only way to be sure the
answer matches.

**Next time.** Any check on a URL, a path, a hostname or a content type that is
written with `startsWith`, `endsWith`, `includes` or a regex is a guess at what
a real parser does, and the gap between the guess and the parser is where the
bug lives. Parse, then inspect the parsed result. Same instinct as using
DOMPurify instead of a tag blocklist, which this repo already argues for in the
production module.

## Adding a dev dependency to one workspace broke `tsc` in six others

**Expected.** `@vitest/browser` goes into `learning/testing` so that module can
run a suite in Chromium. Nothing else in the repo uses browser mode, so nothing
else should notice.

**What happened.** `npm run typecheck` failed in accessibility, performance,
routing, typescript-react, bookmark-manager and dashboard, on six assertions
that were correct and passing:

```
error TS2345: Argument of type 'RegExp' is not assignable to parameter of
type 'string | number'.
```

All six were `expect(x).toHaveTextContent(/some pattern/)`.

`@vitest/browser` ships its own copy of the jest-dom matcher declarations, for
use with `expect.element` in browser mode, and augments `vitest`'s `Assertion`
interface with them. In that copy `toHaveTextContent` takes `string | number`.
jest-dom's real signature is `string | RegExp`, and the runtime has always
accepted a RegExp.

npm hoists the package to the root `node_modules`, and TypeScript pulls the
augmentation into any program that imports `vitest`. `tsc --explainFiles` is
what showed it:

```
Imported via 'vitest' from file 'node_modules/@vitest/browser/matchers.d.ts'
```

**The call.** One declaration in `config/testing-matchers.d.ts`, which every
workspace already includes, adding the missing overload back. Interface
declarations merge and a method declared twice becomes an overload set rather
than a redefinition, so the correct shape is restored everywhere and no test
changed.

The alternative was rewriting six regexes as substrings to satisfy a
declaration that is wrong about the library it describes, which would have
meant weakening six real assertions for a types bug.

**Next time.** A dev dependency in one workspace of a monorepo is a dependency
of all of them as far as TypeScript is concerned, because hoisting and global
module augmentation do not respect workspace boundaries. When a package ships
`declare module` for something another package already declares, expect a
conflict and check `npm run typecheck` across every workspace rather than the
one you were working in. `tsc --explainFiles | grep <package>` answers "why is
this file in my program" in one command.
