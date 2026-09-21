import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PORTS } from "../../../config/ports.ts";

/**
 * axe against a real page, which is the only place two of its rules work.
 *
 * `colour-contrast` needs rendered pixels and computed styles, so jsdom cannot
 * evaluate it: `learning/accessibility/src/axe.ts` disables the rule there
 * rather than let it report a false pass. The same is true of anything that
 * depends on an element's visibility or position. Running axe in Chromium is
 * what closes that gap.
 *
 * The component-level axe tests in `learning/accessibility` are still worth
 * having: they fail on the component rather than on a page, which is a much
 * shorter path to the fix.
 */
test.use({ baseURL: `http://localhost:${PORTS.accessibility}` });

const LESSONS = ["01-the-tree", "02-keyboard", "03-focus-management", "04-live-regions"] as const;

for (const lesson of LESSONS) {
  test(`${lesson} has no axe violations in a real browser`, async ({ page }) => {
    await page.goto(`/#${lesson}`);
    await expect(page.getByRole("navigation", { name: "Lessons" })).toBeVisible();

    const results = await new AxeBuilder({ page })
      // The shell, not the lesson's own deliberate mistakes.
      .include(".lesson-demo")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // A readable failure: the rule and the element, not a count.
    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n");

    expect(summary).toBe("");
  });
}

test("the deliberately broken panel is caught, including contrast", async ({ page }) => {
  await page.goto("/#05-axe");
  await expect(page.getByTestId("broken")).toBeVisible();

  const results = await new AxeBuilder({ page }).include('[data-testid="broken"]').analyze();

  const ids = results.violations.map((violation) => violation.id);
  expect(ids).toContain("image-alt");
  expect(ids).toContain("button-name");
});

test("the fixed panel passes in a browser too, contrast included", async ({ page }) => {
  await page.goto("/#05-axe");
  await expect(page.getByTestId("fixed")).toBeVisible();

  // This run *does* evaluate colour-contrast, which the jsdom version had to
  // switch off. Passing here is a stronger claim than passing there.
  const results = await new AxeBuilder({ page }).include('[data-testid="fixed"]').analyze();

  expect(results.violations.map((violation) => violation.id)).toEqual([]);
});
