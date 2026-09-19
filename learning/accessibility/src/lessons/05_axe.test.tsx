import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { analyse, describeViolations } from "../axe";
import { BrokenPanel, FixedPanel, PassesAxeStillBad } from "./05_axe";

/** An assertion whose failure message names the rules rather than counting them. */
async function expectNoViolations(container: Element): Promise<void> {
  const violations = await analyse(container);
  expect(violations, describeViolations(violations)).toHaveLength(0);
}

describe("what axe catches", () => {
  it("finds every planted violation", async () => {
    render(<BrokenPanel />);

    const violations = await analyse(screen.getByTestId("broken"));
    const ids = violations.map((violation) => violation.id);

    expect(ids).toContain("image-alt");
    expect(ids).toContain("button-name");
    expect(ids).toContain("tabindex");
  });

  it("says which element, not just how many", async () => {
    render(<BrokenPanel />);

    const violations = await analyse(screen.getByTestId("broken"));
    const imageAlt = violations.find((violation) => violation.id === "image-alt");

    // "expected 3 to be 0" is useless. This is what makes the failure fixable.
    expect(imageAlt?.nodes[0]).toContain("<img");
    expect(imageAlt?.impact).toBe("critical");
  });

  it("reports nothing once they are fixed", async () => {
    render(<FixedPanel />);

    await expectNoViolations(screen.getByTestId("fixed"));
  });
});

describe("what axe cannot catch", () => {
  it("passes a panel that is unusable", async () => {
    render(<PassesAxeStillBad />);

    // Every element has a name, a label and alt text. All of them are wrong,
    // and at runtime none of that is distinguishable from correct.
    await expectNoViolations(screen.getByTestId("subtle"));
  });

  it("leaves the useless alt text to a different tool", async () => {
    render(<PassesAxeStillBad />);

    // axe sees a string and cannot judge it. `jsx-a11y/img-redundant-alt`
    // reads the source and flags it before the build, which is why that rule
    // is switched off on the line in the lesson.
    const violations = await analyse(screen.getByTestId("subtle"));
    expect(violations.map((violation) => violation.id)).not.toContain("image-alt");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "image");
  });

  it("but the queries in the other lessons do catch it", () => {
    render(<PassesAxeStillBad />);

    // The button says "Next" and is announced as something else, so a user
    // asking for the button they can see does not find it. axe has no rule
    // for this; a role-and-name query does.
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit the form/ })).toBeInTheDocument();

    // A field labelled "Name" that collects an email.
    expect(screen.getByLabelText("Name")).toHaveAttribute("type", "email");
  });
});

describe("the wrapper", () => {
  it("formats violations so a failure is readable", async () => {
    render(<BrokenPanel />);
    const violations = await analyse(screen.getByTestId("broken"));

    const described = describeViolations(violations);
    expect(described).toContain("image-alt");
    expect(described).toContain("critical");
  });

  it("says so plainly when there is nothing to report", () => {
    expect(describeViolations([])).toBe("no violations");
  });
});
