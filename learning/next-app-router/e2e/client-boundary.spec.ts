import { expect, test } from "@playwright/test";

/** The claim: only the leaf is interactive, and only the leaf is shipped. */
test("the client leaf works", async ({ page }) => {
  await page.goto("/products/keyboard");

  const quantity = page.getByTestId("quantity");
  await expect(quantity).toHaveText("0");

  await page.getByRole("button", { name: "One more" }).click();
  await page.getByRole("button", { name: "One more" }).click();

  await expect(quantity).toHaveText("2");
});

test("it respects the stock the server told it about", async ({ page }) => {
  // The mouse has 3 in stock, and that number came from the server as a prop.
  await page.goto("/products/mouse");

  for (let i = 0; i < 5; i += 1) {
    const plus = page.getByRole("button", { name: "One more" });
    if (await plus.isDisabled()) break;
    await plus.click();
  }

  await expect(page.getByTestId("quantity")).toHaveText("3");
  await expect(page.getByRole("button", { name: "One more" })).toBeDisabled();
});

test("an out-of-stock product renders no interactive control at all", async ({ page }) => {
  await page.goto("/products/monitor");

  await expect(page.getByTestId("out-of-stock")).toBeVisible();
  await expect(page.getByTestId("add-to-basket")).toHaveCount(0);
});

test("the server-rendered part of the page is there without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/products/keyboard");

  // Everything outside the client leaf still works.
  await expect(page.getByRole("heading", { name: "Mechanical keyboard" })).toBeVisible();
  await expect(page.getByText("12 in stock")).toBeVisible();

  // The counter is rendered but inert, which is the honest trade: a client
  // component needs its bundle.
  await expect(page.getByTestId("quantity")).toHaveText("0");
  await page.getByRole("button", { name: "One more" }).click();
  await expect(page.getByTestId("quantity")).toHaveText("0");

  await context.close();
});
