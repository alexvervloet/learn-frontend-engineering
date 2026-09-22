import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DesignTokens, applyTheme } from "./03_design_tokens";

const tokensCss = readFileSync(join(import.meta.dirname, "..", "tokens.css"), "utf8");

/**
 * The file with its comments taken out.
 *
 * LESSONS.md already has an entry called "A substring check matched the
 * comment explaining it", and writing these tests produced it a second time:
 * the docblock at the top of tokens.css describes the
 * `@media (prefers-color-scheme: dark)` shape it replaced, so a search for
 * that string found the paragraph saying it is gone. Assert against the rules,
 * not the prose.
 */
const rules = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every `--role: value;` declaration in the file, as [name, value] pairs. */
function declarations(): [string, string][] {
  return [...rules.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1] ?? "",
    (match[2] ?? "").trim(),
  ]);
}

afterEach(() => {
  delete document.documentElement.dataset["theme"];
  document.documentElement.style.colorScheme = "";
});

describe("the token file", () => {
  /**
   * The assertion that replaced "the dark block declares every role the light
   * block does".
   *
   * That one existed because two parallel lists can drift: declare a role in
   * `:root`, forget it in the dark block, and it keeps its light value in dark
   * mode, which is usually white text on white. Nothing warns you, because
   * nothing is wrong with the CSS.
   *
   * `light-dark()` makes the drift unspellable rather than merely detectable.
   * There is one list, and a role cannot have one value without the other,
   * because the function takes two arguments. This test now checks the
   * property that gives that guarantee.
   */
  it("gives every role both of its values in one declaration", () => {
    const roles = declarations();

    expect(roles.length).toBeGreaterThan(5);
    for (const [name, value] of roles) {
      expect(value, `${name} is not a light-dark() pair`).toMatch(/^light-dark\(.+,.+\)$/s);
    }
  });

  it("has no second list of tokens under a media query", () => {
    // The old shape. If one comes back, so does the drift the test above
    // exists to prevent, and so does the :not() guard it needed.
    expect(rules).not.toMatch(/@media[^{]*prefers-color-scheme/);
  });

  it("drives the three states with color-scheme and nothing else", () => {
    expect(rules).toMatch(/:root\s*\{[^}]*color-scheme:\s*light dark/);
    expect(rules).toMatch(/:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light;\s*\}/);
    expect(rules).toMatch(/:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark;\s*\}/);
  });
});

describe("applying a theme", () => {
  it("sets the attribute on the document element, not a wrapper", () => {
    applyTheme("dark");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("removes the attribute for system rather than setting a third value", () => {
    applyTheme("dark");
    applyTheme("system");

    // "system" matches neither CSS rule, so it has to be absence.
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(document.documentElement.style.colorScheme).toBe("light dark");
  });
});

describe("the switcher", () => {
  it("starts on system and reports the current choice to assistive tech", async () => {
    render(<DesignTokens />);

    expect(screen.getByRole("button", { name: "system" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).not.toHaveAttribute("data-theme");

    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByRole("button", { name: "dark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("goes back to following the OS", async () => {
    render(<DesignTokens />);

    await userEvent.click(screen.getByRole("button", { name: "light" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
