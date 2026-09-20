import { expect, test, type Page } from "@playwright/test";

/**
 * Scoped to the header link, and it has to be.
 *
 * After a streamed update React leaves the previous copy of the boundary's
 * content in a `<div hidden>` template in the DOM. A bare
 * `getByTestId("bag-count")` matches both and trips strict mode, with the
 * stale one still reading 0. The leftover is invisible and inert, so this
 * is a locator problem rather than a bug, but it is the second time in
 * this repo that React's hidden streaming container has broken a test.
 */
function bagCount(page: Page) {
  return page.getByTestId("bag-link").getByTestId("bag-count");
}

test.describe("adding to the bag", () => {
  test("updates the count in the header, which a different component renders", async ({ page }) => {
    await page.goto("/products/walnut-desk-mat");
    await expect(bagCount(page)).toHaveText("0");

    await page.getByTestId("add-to-cart").click();

    // The action calls revalidatePath("/", "layout"), which is what makes
    // the header catch up. Without it the count is stale until a reload.
    await expect(bagCount(page)).toHaveText("1");
    await expect(page.getByTestId("add-result")).toContainText("added");
  });

  test("refuses to add more than there are", async ({ page }) => {
    // Four in stock. Ask for ten.
    await page.goto("/products/brass-monitor-riser");
    await page.getByLabel("Quantity").fill("10");
    await page.getByTestId("add-to-cart").click();

    await expect(bagCount(page)).toHaveText("4");

    await page.getByTestId("add-to-cart").click();
    await expect(page.getByTestId("add-result")).toContainText("Only 4 left");
  });

  test("cannot add something out of stock", async ({ page }) => {
    await page.goto("/products/desk-microphone");

    await expect(page.getByTestId("stock")).toContainText("Out of stock");
    await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  });

  test("works with JavaScript switched off, because it is a real form", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/products/paper-lantern");
    await page.getByTestId("add-to-cart").click();
    await page.goto("/cart");

    // useActionState is the enhancement. The mechanism underneath is a
    // form posting to an endpoint, and it still works.
    await expect(page.getByTestId("cart-line")).toHaveCount(1);

    await context.close();
  });
});

test.describe("the bag", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/paper-lantern");
    await page.getByTestId("add-to-cart").click();
    await expect(bagCount(page)).toHaveText("1");
    await page.goto("/cart");
  });

  test("charges delivery under fifty pounds and drops it over", async ({ page }) => {
    // £26.00, so £3.95 delivery.
    await expect(page.getByTestId("subtotal")).toHaveText("£26.00");
    await expect(page.getByTestId("delivery")).toHaveText("£3.95");
    await expect(page.getByTestId("shortfall")).toContainText("£24.00");

    await page.getByRole("button", { name: "One more Paper lantern" }).click();
    await page.getByRole("button", { name: "One more Paper lantern" }).click();

    // £78.00.
    await expect(page.getByTestId("delivery")).toHaveText("Free");
    await expect(page.getByTestId("shortfall")).toHaveCount(0);
  });

  test("shows the new quantity before the server has answered", async ({ page }) => {
    const quantity = page.getByTestId("quantity-paper-lantern");
    await expect(quantity).toHaveText("1");

    await page.getByRole("button", { name: "One more Paper lantern" }).click();

    // useOptimistic paints this immediately. The round trip follows, and
    // £52.00 clears the free-delivery threshold, so the total is the
    // subtotal.
    await expect(quantity).toHaveText("2");
    await expect(page.getByTestId("total")).toHaveText("£52.00");
    await expect(page.getByTestId("delivery")).toHaveText("Free");
  });

  test("empties when the last one is removed", async ({ page }) => {
    await page.getByTestId("remove-paper-lantern").click();

    await expect(page.getByTestId("empty-bag")).toBeVisible();
    await expect(bagCount(page)).toHaveText("0");
  });

  test("survives a reload, because it is in a cookie and not in memory", async ({ page }) => {
    await page.reload();

    await expect(page.getByTestId("cart-line")).toHaveCount(1);
  });
});

test.describe("checkout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products/walnut-desk-mat");
    await page.getByTestId("add-to-cart").click();
    await expect(bagCount(page)).toHaveText("1");
    await page.goto("/cart");
  });

  test("rejects a bad postcode on the server and says so out loud", async ({ page }) => {
    await page.getByLabel("Name").fill("A Person");
    await page.getByLabel("Email").fill("person@example.com");
    await page.getByLabel("Postcode").fill("not a postcode");
    await page.getByTestId("place-order").click();

    await expect(page.getByTestId("checkout-error")).toContainText("not a UK postcode");
    await expect(page).toHaveURL(/\/cart$/);
  });

  test("places the order and empties the bag", async ({ page }) => {
    await page.getByLabel("Name").fill("A Person");
    await page.getByLabel("Email").fill("person@example.com");
    await page.getByLabel("Postcode").fill("SW1A 1AA");
    await page.getByTestId("place-order").click();

    await expect(page.getByTestId("order-done")).toBeVisible();
    await expect(bagCount(page)).toHaveText("0");
  });
});

test.describe("search", () => {
  test("puts the query in the URL, so it is a link you can send", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Find").fill("lamp");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/q=lamp/);
    await expect(page.getByTestId("result-count")).toHaveText("1 product");
  });

  test("restores the filters from the URL on a cold load", async ({ page }) => {
    await page.goto("/search?category=light&sort=price-desc");

    await expect(page.getByLabel("Category")).toHaveValue("light");
    await expect(page.getByLabel("Sort by")).toHaveValue("price-desc");

    const names = await page.getByTestId("product-card").allInnerTexts();
    expect(names[0]).toContain("Clamp task lamp");
  });

  test("goes back to the previous search, because the URL is the state", async ({ page }) => {
    await page.goto("/search?q=lamp");
    await expect(page.getByTestId("result-count")).toHaveText("1 product");

    await page.goto("/search?q=desk");
    await expect(page.getByTestId("result-count")).toHaveText("2 products");

    await page.goBack();
    await expect(page.getByTestId("result-count")).toHaveText("1 product");
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/search?q=zzzz");

    await expect(page.getByTestId("no-results")).toBeVisible();
  });
});
