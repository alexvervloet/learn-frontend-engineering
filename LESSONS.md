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
