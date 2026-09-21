// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, …) are installed at
// runtime by config/vitest.setup.ts. This file is what tells TypeScript about
// them: the /vitest subpath carries the declaration that augments Vitest's
// Assertion interface.
//
// Every workspace's tsconfig lists this file in `include`, because a type-only
// side effect has to be part of the program to apply.
import "@testing-library/jest-dom/vitest";

/**
 * And this is the repair for a conflict the browser-mode dependency brought
 * with it.
 *
 * `@vitest/browser` ships its *own* copy of the jest-dom matcher declarations
 * for use with `expect.element`, and augments `vitest`'s `Assertion` with
 * them. That copy types `toHaveTextContent` as taking `string | number`.
 * jest-dom's real signature is `string | RegExp`, and the runtime has always
 * accepted a RegExp.
 *
 * Installing `@vitest/browser` in one workspace therefore broke `tsc` in six
 * others, on assertions that were correct and passing, because npm hoists the
 * package to the root and Vitest pulls its types in wherever `vitest` is
 * imported.
 *
 * Interface declarations merge, and a method declared twice becomes an
 * overload set rather than a redefinition, so adding the missing shape back
 * here restores it everywhere without touching a single test. The alternative
 * was rewriting six regexes as substrings to satisfy a declaration that is
 * simply wrong about the library it describes.
 */
declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveTextContent(
      text: string | RegExp,
      options?: { normalizeWhitespace: boolean },
    ): Assertion<T>;
  }
}
