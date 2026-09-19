import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TailwindTheme } from "./02_tailwind_theme";

// Read from disk, not through the bundler. `import "../tailwind.css?raw"` comes
// back as an empty string here: this module's vitest config only processes
// `.module.css`, and everything else is stubbed out before `?raw` is honoured.
// An empty string would make every assertion below pass vacuously, which is a
// worse outcome than a missing file.
const tailwindCss = readFileSync(join(import.meta.dirname, "..", "tailwind.css"), "utf8");

function declaredTokens(prefix: string): string[] {
  return [...tailwindCss.matchAll(new RegExp(`--${prefix}-([\\w-]+):`, "g"))].map(
    (match) => match[1] ?? "",
  );
}

describe("@theme declares what the utilities need", () => {
  it("declares every brand shade the lesson renders", () => {
    render(<TailwindTheme />);

    const used = [...screen.getByTestId("swatches").querySelectorAll("[class]")]
      .flatMap((node) => [...node.classList])
      .filter((name) => name.startsWith("bg-brand-"))
      .map((name) => name.replace("bg-brand-", ""));

    expect(used.length).toBeGreaterThan(0);

    // A shade with no token generates no CSS and produces an unstyled element,
    // silently. This is the guard against that.
    const declared = declaredTokens("color-brand");
    for (const shade of used) expect(declared).toContain(shade);
  });

  it("declares the spacing token the layout uses", () => {
    render(<TailwindTheme />);

    expect(screen.getByTestId("swatches")).toHaveClass("gap-gutter");
    expect(declaredTokens("spacing")).toContain("gutter");
  });

  it("has no tailwind.config.js to fall back on", () => {
    // v4 keeps its configuration in CSS. A config file appearing alongside it
    // means two sources of truth that will disagree. import.meta.glob is
    // resolved by Vite at build time and is empty when nothing matches.
    const configFiles = import.meta.glob("../../tailwind.config.*");

    expect(Object.keys(configFiles)).toEqual([]);
  });
});

describe("the layers", () => {
  it("fixes the layer order explicitly rather than leaving it to emit order", () => {
    expect(tailwindCss).toMatch(/@layer\s+theme,\s*base,\s*components,\s*utilities;/);
  });

  it("leaves preflight out, because the shell already has a reset", () => {
    // Match the import, not the word: the file explains at length why preflight
    // is left out, and a substring check on "preflight" fails on the comment.
    expect(tailwindCss).not.toMatch(/@import\s+"tailwindcss\/preflight/);
    // `@import "tailwindcss"` pulls in preflight too, so its absence matters.
    expect(tailwindCss).not.toMatch(/@import\s+"tailwindcss";/);
    expect(tailwindCss).toContain('@import "tailwindcss/utilities.css"');
  });
});
