import { expect, test } from "@playwright/test";

/**
 * The claim from `learning/styling` lesson 03: an explicit light choice beats a
 * dark OS setting.
 *
 * The mechanism is `light-dark()` reading `color-scheme`, so choosing light
 * pins `color-scheme: light` on `<html>` and every token resolves to its light
 * value. It used to be a `@media (prefers-color-scheme: dark)` block guarded
 * by `:root:not([data-theme="light"])`, and the behaviour asserted here is
 * deliberately identical, which is the point of testing behaviour: the
 * implementation underneath these assertions was replaced and they did not
 * have to change.
 *
 * jsdom has no `prefers-color-scheme`, no `light-dark()` and no cascade, so
 * its tests can only read the stylesheet. Playwright can emulate the OS
 * setting, which is the only way to settle this one.
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

  // The user's choice wins over the OS. Take the `color-scheme: light` off
  // `:root[data-theme="light"]` and these two are identical, with nothing in
  // the console to say so.
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
