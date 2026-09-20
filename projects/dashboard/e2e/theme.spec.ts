import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Runs twice: once in each colour scheme, from the project list in the
 * config. Dark is a selected set of steps validated against the dark
 * surface, not an automatic inversion of light, so it gets its own contrast
 * run rather than a screenshot diff.
 */
test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has no axe violations on the chart view", async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).analyze();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });

  test("has no axe violations on the table view of the chart", async ({ page }) => {
    await page.getByRole("button", { name: /show the table/i }).click();
    const { violations } = await new AxeBuilder({ page }).analyze();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });

  test("keeps text readable against the surface it sits on", async ({ page }) => {
    // Colour contrast is the one axe rule that needs real rendering: it
    // composites the actual painted pixels, which is why it is here and not
    // in the jsdom suite.
    const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();

    expect(violations).toEqual([]);
  });

  test("shows a visible focus ring on every interactive thing", async ({ page }) => {
    const targets = [
      page.getByRole("button", { name: "7 days" }),
      page.getByRole("textbox", { name: /filter/i }),
      page.getByTestId("event-grid"),
    ];

    for (const target of targets) {
      await target.focus();
      const outline = await target.evaluate((node) => {
        const style = getComputedStyle(node);
        return `${style.outlineStyle} ${style.outlineWidth}`;
      });

      expect(outline).not.toMatch(/^none/);
    }
  });

  test("reveals the skip link on focus and moves focus with it", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to the content/i });

    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });
});

test.describe("the two themes", () => {
  test("paints a different surface in each scheme", async ({ page }) => {
    await page.goto("/");

    const scheme = await page.evaluate(() =>
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );

    // The exact validated steps, so a regression that silently serves the
    // light surface in dark mode fails here rather than passing on
    // "they are different".
    const expected = { light: "#fcfcfb", dark: "#1a1a19" }[scheme];

    for (const selector of [":root", ".viz-root"]) {
      const surface = await page
        .locator(selector)
        .evaluate((node) => getComputedStyle(node).getPropertyValue("--surface-1").trim());

      // Both, because body sits between them and reads the tokens itself.
      expect(surface.toLowerCase()).toBe(expected);
    }
  });

  test("honours an explicit data-theme over the system preference", async ({ page }) => {
    await page.goto("/");

    const systemSurface = await page
      .locator(".viz-root")
      .evaluate((node) => getComputedStyle(node).getPropertyValue("--surface-1").trim());

    await page.evaluate(() => {
      document.documentElement.dataset["theme"] = "dark";
    });

    const forced = await page
      .locator(".viz-root")
      .evaluate((node) => getComputedStyle(node).getPropertyValue("--surface-1").trim());

    const scheme = await page.evaluate(() =>
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    );

    if (scheme === "light") expect(forced).not.toBe(systemSurface);
    else expect(forced).toBe(systemSurface);
  });
});
