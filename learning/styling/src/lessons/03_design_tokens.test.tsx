import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DesignTokens, applyTheme } from "./03_design_tokens";

const tokensCss = readFileSync(join(import.meta.dirname, "..", "tokens.css"), "utf8");

/** The custom properties declared inside one selector block. */
function tokensIn(selector: string): string[] {
  const block = new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(tokensCss);
  if (block === null) throw new Error(`no block for ${selector} in tokens.css`);
  return [...(block[1] ?? "").matchAll(/(--[\w-]+):/g)].map((match) => match[1] ?? "").sort();
}

afterEach(() => {
  delete document.documentElement.dataset["theme"];
  document.documentElement.style.colorScheme = "";
});

describe("the token file", () => {
  it("redefines every role in dark, so nothing falls back to a light value", () => {
    const light = tokensIn(":root");
    const dark = tokensIn(':root\\[data-theme="dark"\\]');

    // A role declared in :root but missing from the dark block keeps its light
    // value in dark mode. Usually that is white text on white.
    expect(dark).toEqual(light);
    expect(light.length).toBeGreaterThan(5);
  });

  it("guards the media query so an explicit light choice wins", () => {
    // Without the :not(), a dark OS beats the user's own choice.
    expect(tokensCss).toMatch(/:root:not\(\[data-theme="light"\]\)/);
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
