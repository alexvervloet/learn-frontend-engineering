import { expect, test } from "@playwright/test";

/**
 * The claim: a Server Component's data is in the HTML, and the module that
 * fetched it never reaches the browser.
 *
 * Neither half can be checked in jsdom. The first needs the real response
 * body rather than a rendered tree; the second needs the actual bundles.
 */
test("the data is in the HTML the server sent", async ({ request }) => {
  const response = await request.get("/products");
  const html = await response.text();

  // Not "the page shows it after React runs". It is in the bytes.
  expect(html).toContain("Mechanical keyboard");
  expect(html).toContain("Ultrawide monitor");
});

test("the page works with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/products");

  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mechanical keyboard" })).toBeVisible();

  await context.close();
});

test("navigating to a product works without JavaScript too", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/products");
  await page.getByRole("link", { name: "Trackball mouse" }).click();

  // A real navigation, server-rendered. No router, no bundle.
  await expect(page.getByRole("heading", { name: "Trackball mouse" })).toBeVisible();
  await expect(page.getByText("Takes a week to get used to")).toBeVisible();

  await context.close();
});

test("the data module is in no client bundle", async ({ page }) => {
  const scripts: string[] = [];

  page.on("response", (response) => {
    if (response.url().endsWith(".js")) scripts.push(response.url());
  });

  await page.goto("/products");
  await expect(page.getByTestId("products")).toBeVisible();

  const bodies = await Promise.all(
    scripts.map(async (url) => {
      const response = await page.request.get(url);
      return response.text();
    }),
  );

  // A string that only exists in lib/data.ts. If the module were bundled, this
  // would be in one of the chunks, and so would anything else in that file.
  const marker = "Clicky, heavy, and louder";
  expect(bodies.some((body) => body.includes(marker))).toBe(false);
  expect(scripts.length).toBeGreaterThan(0);
});

test("a missing product renders the not-found boundary with a 404", async ({ page }) => {
  const response = await page.goto("/products/does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toBeVisible();
});
