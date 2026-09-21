import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MeasuredColumns, columnsFor } from "./06_browser_mode";

const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");

/** Every workspace that has an `e2e` script, with its package.json. */
function e2eWorkspaces(): { dir: string; pkg: Record<string, unknown> }[] {
  const found: { dir: string; pkg: Record<string, unknown> }[] = [];

  for (const group of ["learning", "projects"]) {
    const groupDir = join(repoRoot, group);
    if (!existsSync(groupDir)) continue;

    for (const name of readdirSync(groupDir)) {
      const dir = join(groupDir, name);
      const manifest = join(dir, "package.json");
      if (!existsSync(manifest)) continue;

      const pkg = JSON.parse(readFileSync(manifest, "utf8")) as Record<string, unknown>;
      const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
      if (typeof scripts["e2e"] === "string") found.push({ dir, pkg });
    }
  }

  return found;
}

/**
 * The jsdom half, and it is honest about being the smaller half.
 *
 * The arithmetic is pure, so it is checked here and there is no reason to
 * start a browser for a comparison operator. What cannot be checked here is
 * the measurement that feeds it, because jsdom does no layout and every
 * element is 0×0.
 *
 * `06_browser_mode.browser.test.tsx` is the same component under
 * `npm run test:browser -w learning/testing`, in a real Chromium.
 */
describe("the arithmetic, which needs no browser at all", () => {
  it("picks a column count per breakpoint", () => {
    expect(columnsFor(0)).toBe(1);
    expect(columnsFor(399)).toBe(1);
    expect(columnsFor(400)).toBe(2);
    expect(columnsFor(799)).toBe(2);
    expect(columnsFor(800)).toBe(3);
    expect(columnsFor(1200)).toBe(4);
  });

  it("is inclusive at the breakpoint, which is the off-by-one worth pinning", () => {
    expect(columnsFor(400)).toBe(2);
    expect(columnsFor(400 - 0.5)).toBe(1);
  });

  it("does not go below one column for a nonsense width", () => {
    // Width can be 0 during the first render and negative never, but a
    // display:none ancestor reports 0 and a grid with 0 columns is invalid
    // CSS that silently collapses the layout.
    expect(columnsFor(0)).toBe(1);
    expect(columnsFor(-100)).toBe(1);
  });
});

describe("what jsdom can say about the component", () => {
  it("renders every cell", () => {
    // Structure is fine. jsdom is a DOM, it is just not a renderer.
    render(<MeasuredColumns items={6} />);
    expect(screen.getAllByTestId("cell")).toHaveLength(6);
  });

  it("measures zero, and therefore falls back to one column", () => {
    // Not a bug being papered over. This asserts the fallback is sane, which
    // is a real requirement: a component that divides by its own width has to
    // survive being measured before layout, inside a display:none ancestor,
    // and during server rendering.
    render(<MeasuredColumns />);

    expect(screen.getByTestId("measured-width")).toHaveTextContent("0");
    expect(screen.getByTestId("column-count")).toHaveTextContent("1");
  });

  it("cannot tell you what a browser would do, and should not pretend to", () => {
    // The repo-wide setup stubs ResizeObserver with a no-op precisely so this
    // stays true. A fake reporting plausible sizes would let this file assert
    // a column count no browser had computed, which is worse than not
    // asserting it: the test would pass while the component was broken.
    render(<MeasuredColumns />);

    const grid = screen.getByTestId("grid");
    expect(grid.style.gridTemplateColumns).toBe("repeat(1, minmax(0, 1fr))");
    // And the box really is zero-sized here, which is the whole problem.
    expect(grid.getBoundingClientRect().width).toBe(0);
  });
});

/**
 * The assumption the CI job rests on, written down as a test.
 *
 * Seven workspaces run Playwright, and the e2e job installs the browsers
 * once. That works because Playwright keeps them in a shared cache outside
 * the repo, so whichever workspace asks first supplies the rest.
 *
 * It holds only while every one of them resolves the *same* Playwright. Give
 * one its own version and npm stops hoisting, that workspace gets a nested
 * copy expecting a different browser build, and CI fails with a message about
 * a missing executable rather than about a version conflict. The install step
 * used to be `-w learning/testing`, which made the coupling look deliberate
 * when it was luck.
 */
describe("the browser install every e2e suite shares", () => {
  it("finds the workspaces that need a browser", () => {
    // If this ever returns nothing, the assertions below would pass
    // vacuously, which is the failure mode of testing over a glob.
    expect(e2eWorkspaces().length).toBeGreaterThanOrEqual(7);
  });

  it("declares one Playwright version across all of them", () => {
    const ranges = new Set<string>();

    for (const { pkg } of e2eWorkspaces()) {
      const dev = (pkg["devDependencies"] ?? {}) as Record<string, string>;
      const deps = (pkg["dependencies"] ?? {}) as Record<string, string>;
      const range = dev["@playwright/test"] ?? deps["@playwright/test"];
      if (range !== undefined) ranges.add(range);
    }

    expect([...ranges]).toHaveLength(1);
  });

  it("keeps Playwright hoisted, so there is one browser build to install", () => {
    // A nested copy is the observable form of the problem: it means npm
    // could not satisfy every workspace from one version.
    const nested = e2eWorkspaces()
      .filter(({ dir }) => existsSync(join(dir, "node_modules", "@playwright", "test")))
      .map(({ dir }) => dir.replace(repoRoot, "").replace(/^\//, ""));

    expect(nested).toEqual([]);
  });

  it("gives every one of them the same install script, so none is a special case", () => {
    const installs = new Set(
      e2eWorkspaces().map(({ pkg }) => {
        const scripts = (pkg["scripts"] ?? {}) as Record<string, string>;
        return scripts["e2e:install"] ?? "(missing)";
      }),
    );

    expect([...installs]).toEqual(["playwright install chromium"]);
  });

  it("has the same script at the root, which is what CI runs", () => {
    const root = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(root.scripts["e2e:install"]).toBe("playwright install chromium");
  });
});
