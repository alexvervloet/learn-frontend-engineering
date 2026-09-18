import type { ComponentProps } from "react";
import { assertType, describe, expectTypeOf, it } from "vitest";

import { Button, Card } from "./01_props_and_children";

/**
 * Type assertions, not runtime ones. Vitest only checks this file because
 * `typecheck` is enabled in this module's vitest.config.ts; without that it
 * would compile as part of `tsc --noEmit` and never be reported as a test.
 *
 * `@ts-expect-error` is the load-bearing part. It fails the build if the line
 * below it *stops* being an error, which is how you assert that something is
 * still rejected.
 */
describe("Button props", () => {
  it("accepts everything a native button accepts", () => {
    expectTypeOf<ComponentProps<"button">>().toExtend<ComponentProps<typeof Button>>();
  });

  it("makes variant optional and closed", () => {
    expectTypeOf<ComponentProps<typeof Button>>().toHaveProperty("variant");
    assertType(<Button variant="danger" />);
    assertType(<Button />);

    // @ts-expect-error "loud" is not one of the three variants
    assertType(<Button variant="loud" />);
  });

  it("still rejects attributes a button does not have", () => {
    // @ts-expect-error href belongs to an anchor
    assertType(<Button href="/somewhere" />);
  });
});

describe("Card props", () => {
  it("takes anything renderable as children", () => {
    assertType(<Card title="t">a string</Card>);
    assertType(<Card title="t">{42}</Card>);
    assertType(<Card title="t">{null}</Card>);
    assertType(
      <Card title="t">
        <b>element</b>
      </Card>,
    );
  });

  it("requires a title, because a card without one is a div", () => {
    // @ts-expect-error title is not optional
    assertType(<Card>body</Card>);
  });
});
