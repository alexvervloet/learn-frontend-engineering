import { describe, expectTypeOf, it } from "vitest";

import type { Bookmark, Checked } from "./07_as_and_satisfies";

import type { Equals } from "../type-assertions";

describe("a schema and its type", () => {
  it("infers the type from the schema, so the two cannot drift", () => {
    expectTypeOf<Bookmark>().toEqualTypeOf<{ id: string; title: string; votes: number }>();
  });

  it("narrows the result union on `ok`", () => {
    const result = {} as Checked;

    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<Bookmark>();
      // @ts-expect-error `problems` only exists on the failure branch
      result.problems;
    } else {
      expectTypeOf(result.problems).toEqualTypeOf<string[]>();
    }
  });
});

describe("satisfies versus an annotation", () => {
  const withSatisfies = { home: "/", about: "/about" } satisfies Record<string, string>;
  const withAnnotation: Record<string, string> = { home: "/", about: "/about" };
  const withBoth = { home: "/", about: "/about" } as const satisfies Record<string, string>;

  it("keeps the exact key set, which the annotation throws away", () => {
    // @ts-expect-error `typo` is not one of the two keys
    withSatisfies.typo;

    // The annotated one accepts the same typo without a word, because
    // Record<string, string> really does say every string key is a string.
    expectTypeOf(withAnnotation["typo"]).not.toBeNever();
  });

  it("does not by itself keep literal values", () => {
    // Record<string, string> gives the values a contextual type of `string`,
    // so the literal widens even under satisfies. This surprises people.
    expectTypeOf<Equals<typeof withSatisfies.home, string>>().toEqualTypeOf<true>();
  });

  it("keeps them when paired with as const", () => {
    expectTypeOf<Equals<typeof withBoth.home, "/">>().toEqualTypeOf<true>();

    // @ts-expect-error still checked, and still exact about its keys
    withBoth.typo;
  });
});

describe("unknown versus any", () => {
  it("refuses to let you read anything off unknown until you narrow it", () => {
    const fromTheNetwork: unknown = JSON.parse("{}");

    // @ts-expect-error unknown has no properties
    fromTheNetwork.title;

    if (
      typeof fromTheNetwork === "object" &&
      fromTheNetwork !== null &&
      "title" in fromTheNetwork
    ) {
      expectTypeOf(fromTheNetwork.title).toEqualTypeOf<unknown>();
    }
  });
});
