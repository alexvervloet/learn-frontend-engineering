import { describe, expectTypeOf, it } from "vitest";

import { useTheme, useToggle, type Theme } from "./06_context_and_hooks";

import type { Equals } from "../type-assertions";

describe("useTheme", () => {
  it("returns Theme, not Theme | null, because the hook throws instead", () => {
    expectTypeOf<ReturnType<typeof useTheme>>().toEqualTypeOf<Theme>();
    expectTypeOf<Equals<ReturnType<typeof useTheme>, Theme | null>>().toEqualTypeOf<false>();
  });
});

describe("useToggle", () => {
  it("returns a tuple rather than an array of the union", () => {
    expectTypeOf<
      Equals<ReturnType<typeof useToggle>, readonly [boolean, () => void]>
    >().toEqualTypeOf<true>();

    // The type you get by forgetting `as const` or an explicit return type. It
    // destructures without complaint and then will not let you call anything.
    expectTypeOf<
      Equals<ReturnType<typeof useToggle>, (boolean | (() => void))[]>
    >().toEqualTypeOf<false>();
  });

  it("types each position separately once destructured", () => {
    const [on, toggle] = useToggle();

    expectTypeOf(on).toEqualTypeOf<boolean>();
    expectTypeOf(toggle).toEqualTypeOf<() => void>();
  });
});
