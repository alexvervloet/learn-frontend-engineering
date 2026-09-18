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
