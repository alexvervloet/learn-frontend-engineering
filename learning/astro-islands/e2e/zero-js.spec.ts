import { expect, test } from "@playwright/test";

/**
 * The claim the entire framework rests on: a React component with no
 * `client:*` directive is rendered to HTML and its code is not shipped.
 *
 * There is no way to check this without loading the real built page and
 * counting what the browser asked for.
 */
test("a page with a React component on it loads no JavaScript at all", async ({ page }) => {
  const scripts: string[] = [];

  page.on("response", (response) => {
    const type = response.request().resourceType();
    if (type === "script") scripts.push(response.url());
  });

  await page.goto("/static/");
  await expect(page.getByTestId("static-counter")).toBeVisible();

  // Not "a small bundle". None.
  expect(scripts).toEqual([]);
});

test("the markup is still there, rendered at build time", async ({ request }) => {
  const html = await (await request.get("/static/")).text();

  expect(html).toContain("Static counter");
  expect(html).toContain('data-testid="static-counter"');
});

test("the buttons are real and inert, which is the honest consequence", async ({ page }) => {
  await page.goto("/static/");

  const value = page.getByTestId("static-counter-value");
  await expect(value).toHaveText("0");

  await page.getByRole("button", { name: "Static counter plus" }).click();

  // No handler was ever attached. This is what "no JavaScript" means, and it
  // is why the directive exists.
  await expect(value).toHaveText("0");
});
