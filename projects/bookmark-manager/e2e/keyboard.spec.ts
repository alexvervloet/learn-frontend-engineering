import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { openAddForm, openFirstBookmark, signIn } from "./helpers";

/**
 * The claims jsdom cannot settle: that the focus ring is visible, that the
 * skip link works, and that the rendered colours pass contrast. Contrast in
 * particular needs real pixels, so axe reports it as *incomplete* in jsdom
 * and the unit tests disable the rule.
 */
test("the skip link is the first tab stop and jumps to the content", async ({ page }) => {
  await signIn(page);

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the content" });
  await expect(skip).toBeFocused();

  // Visible only when focused, and genuinely on screen rather than clipped.
  await expect(skip).toBeInViewport();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
});

test("the focus ring is visible to a keyboard user", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("Tab");

  const hasRing = await page.locator(":focus").evaluate((node) => {
    const style = getComputedStyle(node);
    return style.outlineStyle !== "none" && style.outlineWidth !== "0px";
  });

  // `:focus { outline: none }` is the most damaging line of CSS in common
  // use, and this is the only kind of test that catches it.
  expect(hasRing).toBe(true);
});

test("deleting is possible with the keyboard alone, and focus comes back", async ({ page }) => {
  await signIn(page);
  // Clicked, not `goto`: a reload would sign us out, because the token is in
  // memory by design.
  await page.getByRole("link", { name: "Cascade layers" }).click();
  await expect(page.getByRole("heading", { name: "Cascade layers" })).toBeVisible();

  const deleteButton = page.getByRole("button", { name: "Delete", exact: true });
  await deleteButton.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  // Not the body: the next Tab would start at the top of the page.
  await expect(deleteButton).toBeFocused();
});

const PAGES = [
  { name: "the list", open: async () => undefined },
  { name: "a bookmark", open: openFirstBookmark },
  { name: "the add form", open: openAddForm },
] as const;

for (const { name, open } of PAGES) {
  test(`${name} has no axe violations in a real browser`, async ({ page }) => {
    await signIn(page);
    await open(page);
    await expect(page.locator("#main")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const summary = results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join("\n");

    expect(summary).toBe("");
  });
}
