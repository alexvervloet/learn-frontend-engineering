import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/products", "/products/walnut-desk-mat", "/search?q=lamp", "/cart"];

test.describe("accessibility", () => {
  for (const path of PAGES) {
    test(`has no axe violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Wait for the streamed part, or axe audits the fallback.
      await expect(page.getByRole("main")).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).analyze();

      expect(violations.map((violation) => violation.id)).toEqual([]);
    });
  }

  test("has no violations on a bag with something in it", async ({ page }) => {
    await page.goto("/products/walnut-desk-mat");
    await page.getByTestId("add-to-cart").click();
    // Wait for the action to land before navigating. `goto` right after
    // the click cancels the request that is still in flight, and the cart
    // page then renders empty. It passed about one run in five.
    await expect(page.getByTestId("bag-link").getByTestId("bag-count")).toHaveText("1");

    await page.goto("/cart");
    await expect(page.getByTestId("cart-line")).toHaveCount(1);

    const { violations } = await new AxeBuilder({ page }).analyze();

    expect(violations.map((violation) => violation.id)).toEqual([]);
  });

  test("reveals the skip link on focus and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skip = page.getByRole("link", { name: /skip to the content/i });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("announces what a failed add-to-bag said", async ({ page }) => {
    await page.goto("/products/brass-monitor-riser");
    await page.getByLabel("Quantity").fill("10");
    await page.getByTestId("add-to-cart").click();
    await page.getByTestId("add-to-cart").click();

    // The live region is in the DOM from the first render, empty. A region
    // added at the same moment as its text is often not announced at all.
    const result = page.getByTestId("add-result");
    await expect(result).toHaveAttribute("aria-live", "polite");
    await expect(result).toContainText("Only 4 left");
  });

  test("labels the bag count for a screen reader, not just with a coloured pill", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("bag-link")).toHaveAccessibleName(/items? in your bag/i);
  });
});
