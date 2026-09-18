import { assertType, describe, expectTypeOf, it } from "vitest";

import { List, Text } from "./05_generic_components";

type Person = { id: string; name: string };

describe("List infers its item type", () => {
  it("types renderItem's parameter from items, with no annotation", () => {
    assertType(
      <List
        items={[{ id: "1", name: "Ada" }] satisfies Person[]}
        getKey={(person) => {
          expectTypeOf(person).toEqualTypeOf<Person>();
          return person.id;
        }}
        renderItem={(person, index) => {
          expectTypeOf(person).toEqualTypeOf<Person>();
          expectTypeOf(index).toEqualTypeOf<number>();
          return person.name;
        }}
      />,
    );
  });

  it("carries a literal union through from an as const array", () => {
    const tags = ["react", "vite"] as const;

    assertType(
      <List
        items={tags}
        getKey={(tag) => tag}
        renderItem={(tag) => {
          expectTypeOf(tag).toEqualTypeOf<"react" | "vite">();
          return tag;
        }}
      />,
    );
  });

  it("rejects a getKey written for a different item type", () => {
    assertType(
      // @ts-expect-error a string item has no `.id`
      <List items={["a"]} getKey={(tag: Person) => tag.id} renderItem={String} />,
    );
  });
});

describe("Text is polymorphic at the call site", () => {
  // `children` is required, and leaving it out is not a small thing here:
  // without it the props object no longer matches TextProps<E>, inference for
  // `E` gives up, and the default "span" is used instead. The error you get
  // then is about `as`, not about the missing children, which is thoroughly
  // misleading. Generic inference is all-or-nothing on the object.
  it("accepts an element's own props only when `as` is that element", () => {
    assertType(
      <Text as="a" href="/x">
        link
      </Text>,
    );
    assertType(<Text as="h4">heading</Text>);

    assertType(
      <Text
        as="h4"
        // @ts-expect-error an h4 has no href.
        // The directive sits on the prop, not on the `assertType(` line.
        // Prettier reflows a multi-line JSX call, and a directive above the
        // call then applies to whatever line ends up first, which is usually
        // `assertType(` and is never an error. Pinning it to the prop survives
        // formatting.
        href="/x"
      >
        heading
      </Text>,
    );
  });

  it("defaults to a span, which also has no href", () => {
    // @ts-expect-error the default element is a span
    assertType(<Text href="/x">plain</Text>);
  });
});
