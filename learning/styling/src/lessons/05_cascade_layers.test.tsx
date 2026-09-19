import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CascadeLayers } from "./05_cascade_layers";

const layersCss = readFileSync(join(import.meta.dirname, "..", "layers.css"), "utf8");
const tailwindCss = readFileSync(join(import.meta.dirname, "..", "tailwind.css"), "utf8");

/** The names in the leading `@layer a, b, c;` statement, in order. */
function declaredOrder(css: string): string[] {
  const match = /@layer\s+([\w-]+(?:\s*,\s*[\w-]+)+)\s*;/.exec(css);
  return match === null ? [] : (match[1] ?? "").split(",").map((name) => name.trim());
}

/** Selectors that appear at brace depth zero, so outside any @layer block. */
function topLevelSelectors(css: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let pending = "";

  for (const character of css) {
    if (character === "{") {
      if (depth === 0) found.push(pending.trim().split("\n").at(-1)?.trim() ?? "");
      depth += 1;
      pending = "";
    } else if (character === "}") {
      depth = Math.max(0, depth - 1);
      pending = "";
    } else if (depth === 0) {
      pending += character;
    }
  }

  return found;
}

/**
 * jsdom implements no cascade layers, so `getComputedStyle` here would report
 * the same thing whatever the order. These assertions are structural: they
 * check the stylesheet says what it should. Seeing the weakest selector
 * actually win is a browser job.
 */
describe("layer order", () => {
  it("is declared up front rather than left to bundler output order", () => {
    expect(declaredOrder(layersCss)).toEqual(["demo-reset", "demo-components", "demo-utilities"]);
  });

  it("puts utilities last in the real stylesheet too", () => {
    const order = declaredOrder(tailwindCss);

    expect(order.at(-1)).toBe("utilities");
    // Components before utilities is what lets `bg-brand-500` override `.panel`
    // without a more specific selector.
    expect(order.indexOf("components")).toBeLessThan(order.indexOf("utilities"));
  });

  it("names every layer it later opens, so none can jump the queue", () => {
    const declared = new Set(declaredOrder(layersCss));
    const opened = [...layersCss.matchAll(/@layer\s+([\w-]+)\s*\{/g)].map(
      (match) => match[1] ?? "",
    );

    expect(opened.length).toBeGreaterThan(0);
    for (const name of opened) expect(declared).toContain(name);
  });
});

describe("the demo element", () => {
  it("really does carry all three competing classes", () => {
    render(<CascadeLayers />);

    // If it only had one, the lesson would be proving nothing.
    const element = screen.getByTestId("layered");
    expect(element).toHaveClass("demo-box");
    expect(element).toHaveClass("demo-card");
    expect(element).toHaveClass("demo-accent");
  });

  it("keeps the unlayered rule out of every layer", () => {
    // `.demo-override` has to sit outside every @layer block, or the lesson's
    // second claim is false. A regex cannot answer this, because CSS blocks
    // nest; walking the braces can.
    expect(layersCss).toContain(".demo-override");
    expect(topLevelSelectors(layersCss)).toContain(".demo-override");
  });
});
