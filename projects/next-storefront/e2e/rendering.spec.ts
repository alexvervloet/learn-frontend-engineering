import { expect, test } from "@playwright/test";

/**
 * What the server actually sends, before any JavaScript runs.
 *
 * `page.goto` then reading the DOM tells you what React produced. These
 * tests read the raw response body instead, because the claim being checked
 * is that the work happened on the server.
 */
test.describe("Server Components", () => {
  test("puts the product data in the HTML, not in a fetch after hydration", async ({ request }) => {
    const html = await (await request.get("/products")).text();

    expect(html).toContain("Walnut desk mat");
    expect(html).toContain("Brass monitor riser");
  });

  test("keeps the catalogue out of the JavaScript bundle", async ({ page }) => {
    const scripts: string[] = [];
    page.on("response", async (response) => {
      if (response.url().endsWith(".js")) scripts.push(await response.text());
    });

    await page.goto("/products");
    await expect(page.getByText("Walnut desk mat")).toBeVisible();

    // The blurb exists only in the module marked `server-only`. Finding it
    // in a script would mean the boundary had leaked.
    const bundled = scripts.join("");
    expect(bundled).not.toContain("felt backing so it does not slide");
  });

  test("renders without JavaScript at all", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "Everything" })).toBeVisible();
    expect(await page.getByTestId("product-card").count()).toBe(8);

    await context.close();
  });
});

test.describe("prerendering", () => {
  test("serves a product page's shell as static HTML", async ({ request }) => {
    const html = await (await request.get("/products/walnut-desk-mat")).text();

    expect(html).toContain("Walnut desk mat");
    expect(html).toContain("£64.00");
  });

  test("404s an unknown slug rather than answering 200 with an empty page", async ({ request }) => {
    const response = await request.get("/products/no-such-thing");

    // A 200 on a missing product is how a shop gets a thousand empty pages
    // in a search index.
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("No such product");
  });

  test("sends a bag-count fallback in the first byte and fills it in after", async ({ page }) => {
    const html = await (await page.request.get("/")).text();

    // The count needs the cookie, so it cannot be in the prerendered
    // shell. The same-size placeholder can, and is what stops the header
    // jumping.
    expect(html).toContain("bag-count-pending");

    await page.goto("/");
    await expect(page.getByTestId("bag-count")).toHaveText("0");
  });
});

test.describe("streaming", () => {
  test("sends the search form before the results exist", async ({ page }) => {
    await page.goto("/search?q=lamp");

    // The catalogue read takes 700ms behind its own boundary. The form is
    // in front of it and must not wait.
    await expect(page.getByTestId("search-form")).toBeVisible();
    await expect(page.getByTestId("result-count")).toBeVisible();
  });

  test("closes the connection only once the slow part has arrived", async ({ request }) => {
    const started = Date.now();
    const html = await (await request.get("/search?q=lamp")).text();

    // One response, not two requests: the results are in the same stream,
    // appended after the shell.
    expect(html).toContain("Clamp task lamp");
    expect(Date.now() - started).toBeGreaterThan(500);
  });
});
