import type { ChangeEvent, FormEvent, MouseEvent } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { Equals } from "../type-assertions";

describe("event targets", () => {
  // React spells these `EventTarget & T`, not plain `T`. The intersection is
  // what lets a handler read both the DOM event members and the element's own,
  // and it is why an exact-equality assertion against `HTMLFormElement` fails
  // even though everything you would write in a handler compiles.
  it("types currentTarget as the element the handler is on", () => {
    expectTypeOf<
      Equals<FormEvent<HTMLFormElement>["currentTarget"], EventTarget & HTMLFormElement>
    >().toEqualTypeOf<true>();

    expectTypeOf<
      Equals<ChangeEvent<HTMLInputElement>["currentTarget"], EventTarget & HTMLInputElement>
    >().toEqualTypeOf<true>();
  });

  it("leaves target as EventTarget on everything but a change event", () => {
    // This asymmetry is why `event.target.value` looks like it always works.
    // ChangeEvent is a special case in React's types; nothing else is.
    expectTypeOf<
      Equals<ChangeEvent<HTMLInputElement>["target"], EventTarget & HTMLInputElement>
    >().toEqualTypeOf<true>();

    expectTypeOf<
      Equals<MouseEvent<HTMLButtonElement>["target"], EventTarget>
    >().toEqualTypeOf<true>();
    expectTypeOf<Equals<FormEvent<HTMLFormElement>["target"], EventTarget>>().toEqualTypeOf<true>();
  });

  it("cannot give you value off an untyped target", () => {
    const check = (event: MouseEvent<HTMLButtonElement>) => {
      // @ts-expect-error EventTarget has no `value`
      return event.target.value;
    };
    expectTypeOf(check).toBeFunction();
  });
});

describe("FormData", () => {
  it("returns something that may be a File, or missing entirely", () => {
    expectTypeOf<
      Equals<ReturnType<FormData["get"]>, FormDataEntryValue | null>
    >().toEqualTypeOf<true>();
    expectTypeOf<Equals<FormDataEntryValue, string | File>>().toEqualTypeOf<true>();
  });
});
