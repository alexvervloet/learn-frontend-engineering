import { expect, test } from "@playwright/test";

/**
 * The claim from `learning/performance` lesson 03, which its own tests could
 * not make: a virtualised list of ten thousand rows keeps about twenty of them
 * in the DOM.
 *
 * jsdom performs no layout, so the scroll container measures 0×0 there and the
 * virtualizer correctly renders nothing. This needs a browser, and it is the
 * single clearest example in the repo of a test that has to be end to end.
 */
test.use({ baseURL: "http://localhost:5181" });

test.beforeEach(async ({ page }) => {
  await page.goto("/#03-virtualization");
  await expect(page.getByRole("heading", { name: "Virtualization" })).toBeVisible();
});

test("keeps a window of rows in the DOM, not ten thousand", async ({ page }) => {
  const rendered = page.getByTestId("rendered");

  await expect(rendered).toBeVisible();
  const count = Number(await rendered.textContent());

  expect(count).toBeGreaterThan(5);
  expect(count).toBeLessThan(40);
});

test("swaps which rows exist as you scroll, keeping the count steady", async ({ page }) => {
  await expect(page.getByTestId("row-0")).toBeVisible();

  const before = Number(await page.getByTestId("rendered").textContent());

  await page.getByTestId("scroller").evaluate((node) => {
    node.scrollTop = 100 * 32;
  });

  await expect(page.getByTestId("row-100")).toBeVisible();
  await expect(page.getByTestId("row-0")).toHaveCount(0);

  const after = Number(await page.getByTestId("rendered").textContent());
  // Scrolling 3,200 pixels into the list did not make it more expensive.
  expect(Math.abs(after - before)).toBeLessThan(10);
});

test("gives the scrollbar the full height so scrolling feels honest", async ({ page }) => {
  const inner = page.getByTestId("scroller").locator("> div");

  await expect(inner).toHaveCSS("height", "320000px");
});
