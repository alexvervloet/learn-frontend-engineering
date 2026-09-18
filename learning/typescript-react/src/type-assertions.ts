/**
 * Exact type equality, without unfolding the type.
 *
 * `expectTypeOf(...).toEqualTypeOf<HTMLFormElement>()` compares structurally,
 * and DOM interfaces are enormous and mutually recursive: TypeScript gives up
 * and reports a constraint failure a hundred lines long about `ownerDocument`
 * and `NamedNodeMap`, which says nothing about the thing you were asserting.
 *
 * This is the usual trick instead. Two conditional types are identical only if
 * their check types are identical, so the deferred comparison resolves to
 * `true` or `false` without either type ever being expanded. `expectTypeOf` then
 * only has to compare two booleans.
 */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
