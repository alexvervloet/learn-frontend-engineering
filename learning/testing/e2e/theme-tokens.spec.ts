import { expect, test } from "@playwright/test";

/**
 * The claim from `learning/styling` lesson 03: an explicit light choice beats a
 * dark OS setting, because of one `:not([data-theme="light"])` in the media
 * query.
 *
 * jsdom has no `prefers-color-scheme` and no cascade, so its tests could only
 * read the stylesheet. Playwright can emulate the OS setting, which is the only
 * way to test this properly.
 */
test.use({ colorScheme: "dark" });

async function surface(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(
    () =>
      getComputedStyle(document.querySelector('[data-testid="preview"]') as Element)
        .backgroundColor,
  );
}

test("follows a dark OS by default", async ({ page }) => {
  await page.goto("/#03-design-tokens");
  await expect(page.getByTestId("preview")).toBeVisible();

  const dark = await surface(page);

  await page.getByRole("button", { name: "light" }).click();
  const light = await surface(page);

  // The user's choice wins over the OS. Delete the :not() from tokens.css and
  // these two are identical, with nothing in the console to say so.
  expect(light).not.toBe(dark);
});

test("goes back to following the OS", async ({ page }) => {
  await page.goto("/#03-design-tokens");

  const initial = await surface(page);

  await page.getByRole("button", { name: "light" }).click();
  await page.getByRole("button", { name: "system" }).click();

  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  expect(await surface(page)).toBe(initial);
});
