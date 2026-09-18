import { assertType, describe, expectTypeOf, it } from "vitest";

import { Action, type Feed } from "./04_discriminated_unions";

describe("state unions", () => {
  it("only exposes a field in the state that owns it", () => {
    const state = { status: "loading", since: 1 } as Feed;

    if (state.status === "loading") {
      expectTypeOf(state.since).toEqualTypeOf<number>();
    }

    if (state.status === "ready") {
      // @ts-expect-error `since` belongs to the loading state
      state.since;
    }
  });

  it("refuses a state that mixes two members", () => {
    // @ts-expect-error loading has no `items`
    assertType<Feed>({ status: "loading", since: 1, items: [] });

    // @ts-expect-error failed needs a message
    assertType<Feed>({ status: "failed", canRetry: true });
  });
});

describe("either/or props", () => {
  it("takes one shape or the other", () => {
    assertType(<Action label="a" href="/x" />);
    assertType(<Action label="b" onClick={() => {}} />);
  });

  it("refuses both at once, which is what `?: never` is for", () => {
    // @ts-expect-error href and onClick are mutually exclusive
    assertType(<Action label="c" href="/x" onClick={() => {}} />);
  });

  it("refuses neither", () => {
    // @ts-expect-error one of href or onClick is required
    assertType(<Action label="d" />);
  });
});
