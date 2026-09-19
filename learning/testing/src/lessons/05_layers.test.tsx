import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Layers } from "./05_layers";

const e2eDir = join(import.meta.dirname, "..", "..", "e2e");

describe("the table", () => {
  it("lists every layer with what it cannot do", () => {
    render(<Layers />);

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // Four tools plus the header.
    expect(rows).toHaveLength(5);

    for (const row of rows.slice(1)) {
      expect(within(row).getAllByRole("cell")).toHaveLength(4);
    }
  });
});

/**
 * The lesson claims the e2e suite finishes what jsdom could not. That claim is
 * the kind that rots: someone deletes a spec, the prose still says it exists,
 * and nobody notices for a year. So it is asserted.
 */
describe("the e2e suite the lesson points at", () => {
  const specs = readdirSync(e2eDir).filter((name) => name.endsWith(".spec.ts"));

  it("exists, and is not empty", () => {
    expect(specs.length).toBeGreaterThanOrEqual(3);
  });

  it("covers the three things the styling module could not check in jsdom", () => {
    expect(specs).toContain("container-queries.spec.ts");
    expect(specs).toContain("cascade-layers.spec.ts");
    expect(specs).toContain("theme-tokens.spec.ts");
  });

  it("asserts computed styles, which is the whole reason to use a browser", () => {
    const containerSpec = readFileSync(join(e2eDir, "container-queries.spec.ts"), "utf8");

    // toHaveCSS reads the computed value. Asserting a class name here would be
    // no better than the jsdom test it is supposed to improve on.
    expect(containerSpec).toContain("toHaveCSS");
    expect(containerSpec).toContain("flex-direction");
  });

  it("points at the styling module rather than this one", () => {
    const config = readFileSync(
      join(import.meta.dirname, "..", "..", "playwright.config.ts"),
      "utf8",
    );

    expect(config).toContain("learning/styling");
  });
});
