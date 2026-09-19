import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cn } from "../cn";
import { Button, buttonStyles } from "./06_variants";

describe("tailwind-merge", () => {
  it("keeps the last of two conflicting utilities", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("keeps utilities that do not actually conflict", () => {
    // p-2 sets all sides, px-4 only the inline ones. Both survive, and the
    // cascade resolves them correctly because they are different properties.
    expect(cn("p-2", "px-4")).toBe("p-2 px-4");
  });

  it("is the whole reason not to just concatenate", () => {
    // clsx alone would give "px-2 px-4". Both land in the class attribute, and
    // which one wins depends on their order in Tailwind's output, not yours.
    expect(cn("px-2", "px-4").split(" ")).toHaveLength(1);
  });

  it("drops falsy values without leaving double spaces", () => {
    expect(cn("p-2", false, undefined, null, "", "m-1")).toBe("p-2 m-1");
  });
});

describe("cva", () => {
  it("applies the default variants when none are given", () => {
    const classes = buttonStyles().split(" ");

    expect(classes).toContain("bg-brand-50"); // intent: neutral
    expect(classes).toContain("px-4"); // size: md
  });

  it("swaps only the variant asked for", () => {
    const classes = buttonStyles({ intent: "primary" }).split(" ");

    expect(classes).toContain("bg-brand-500");
    expect(classes).toContain("px-4"); // size default is untouched
  });

  it("adds a compound variant only for the exact combination", () => {
    expect(buttonStyles({ intent: "danger", size: "sm" })).toContain("ring-2");
    expect(buttonStyles({ intent: "danger", size: "md" })).not.toContain("ring-2");
    expect(buttonStyles({ intent: "primary", size: "sm" })).not.toContain("ring-2");
  });

  it("always includes the base classes", () => {
    for (const intent of ["neutral", "primary", "danger"] as const) {
      expect(buttonStyles({ intent })).toContain("rounded-lg");
    }
  });
});

describe("the className prop", () => {
  it("wins over the variant's own utility", () => {
    render(
      <>
        <Button size="sm" data-testid="default-padding">
          a
        </Button>
        <Button size="sm" className="px-8" data-testid="overridden-padding">
          b
        </Button>
      </>,
    );

    const overridden = [...screen.getByTestId("overridden-padding").classList];

    expect(overridden).toContain("px-8");
    // The bug this catches: with the cn arguments the other way round, both
    // px-2 and px-8 end up here and the winner is decided by Tailwind's output
    // order rather than by the caller.
    expect(overridden).not.toContain("px-2");
    expect([...screen.getByTestId("default-padding").classList]).toContain("px-2");
  });

  it("leaves non-conflicting caller classes alone", () => {
    render(
      <Button className="shadow-lg" data-testid="button">
        a
      </Button>,
    );

    const classes = [...screen.getByTestId("button").classList];
    expect(classes).toContain("shadow-lg");
    expect(classes).toContain("rounded-lg");
  });
});
