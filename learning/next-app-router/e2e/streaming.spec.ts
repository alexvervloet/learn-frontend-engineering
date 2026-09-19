import { expect, test } from "@playwright/test";

/**
 * The claim: the shell arrives before the 700ms reviews do.
 *
 * This is the assertion that distinguishes streaming from a page that waits,
 * and it needs a real response over a real connection.
 */
test("the title is painted before the reviews are ready", async ({ page }) => {
  await page.goto("/streaming", { waitUntil: "commit" });

  // Visible while the slow section is still being rendered on the server.
  await expect(page.getByTestId("title")).toBeVisible();
  await expect(page.getByTestId("reviews-fallback")).toBeVisible();
  await expect(page.getByTestId("reviews")).toHaveCount(0);
});

test("the reviews arrive in the same response, with no second request", async ({ page }) => {
  const fetchedBodies: string[] = [];

  page.on("response", async (response) => {
    const type = response.request().resourceType();
    if (type !== "fetch" && type !== "xhr") return;
    fetchedBodies.push(await response.text().catch(() => ""));
  });

  await page.goto("/streaming");

  await expect(page.getByTestId("reviews")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("reviews-fallback")).toHaveCount(0);

  // Counting requests was the wrong assertion: Next prefetches every link in
  // the nav as soon as the page is idle, so there are always several. What
  // matters is that none of them carried the reviews, which were pushed into
  // the original HTML response.
  expect(fetchedBodies.some((body) => body.includes("A review of the keyboard"))).toBe(false);
});

test("the streamed content is in the HTML, even though it needs JS to appear", async ({
  request,
}) => {
  const html = await (await request.get("/streaming")).text();

  // Both are in the response: the fallback where the boundary is, and the real
  // content in a hidden container further down, with a `$RC(…)` script that
  // swaps them.
  expect(html).toContain('data-testid="reviews-fallback"');
  expect(html).toContain('<ul data-testid="reviews"');
  expect(html).toContain("$RC(");
});

test("without JavaScript the fallback is what the user actually sees", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/streaming");

  // The shell renders, because that is plain HTML.
  await expect(page.getByTestId("title")).toBeVisible();

  // The reviews do not, because the swap is a script. This is the limit of
  // streaming's progressive enhancement, and the first version of this test
  // asserted the opposite and failed. A crawler that parses HTML finds the
  // content; a person with scripting off sees the fallback.
  await expect(page.getByTestId("reviews-fallback")).toBeVisible();
  await expect(page.getByTestId("reviews")).toBeHidden();

  await context.close();
});
