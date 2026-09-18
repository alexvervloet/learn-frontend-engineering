import { useRef, type ComponentProps, type RefObject } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { Equals } from "../type-assertions";

describe("useRef", () => {
  it("keeps null in the type when null is what it starts as", () => {
    const element = useRef<HTMLInputElement>(null);

    expectTypeOf<
      Equals<typeof element, RefObject<HTMLInputElement | null>>
    >().toEqualTypeOf<true>();

    // @ts-expect-error current may be null until React has committed
    element.current.focus();
  });

  it("drops null when given a real initial value", () => {
    const count = useRef(0);

    expectTypeOf<Equals<typeof count, RefObject<number>>>().toEqualTypeOf<true>();
    expectTypeOf(count.current).toEqualTypeOf<number>();
  });

  it("requires an initial value at all, which React 18 did not", () => {
    // @ts-expect-error useRef<number>() is an error in React 19
    useRef<number>();
  });
});

describe("ref as a prop", () => {
  it("is already part of ComponentProps, so nothing extra is declared", () => {
    expectTypeOf<ComponentProps<"input">>().toHaveProperty("ref");
  });
});
