import { expect, test } from "@playwright/test";

/**
 * Focus behaviour in a real browser. jsdom tracks `document.activeElement`, so
 * a unit test can assert *what* has focus; it does not do layout or paint, so
 * it cannot tell you whether the focus ring is visible, or whether the element
 * is scrolled into view.
 */
test("the lesson list is reachable and operable from the keyboard alone", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();

  // :focus-visible is the real test of whether a keyboard user can see where
  // they are. A stylesheet that removes outlines fails here and nowhere else.
  const hasRing = await focused.evaluate((node) => {
    const style = getComputedStyle(node);
    return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
  });
  expect(hasRing).toBe(true);
});

test("navigating by keyboard changes the lesson", async ({ page }) => {
  await page.goto("/#01-css-modules");
  await expect(page.getByRole("heading", { name: "CSS modules" })).toBeVisible();

  const link = page.getByRole("link", { name: "Cascade layers" });
  await link.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Cascade layers" })).toBeVisible();
  await expect(link).toHaveAttribute("aria-current", "page");
});
