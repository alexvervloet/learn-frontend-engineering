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
