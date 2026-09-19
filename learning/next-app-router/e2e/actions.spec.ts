import { expect, test } from "@playwright/test";

/**
 * The claim: a server action is a real form post, so it works before
 * hydration and with scripting disabled.
 *
 * Tests run serially because they share one in-memory list of reviews on the
 * server.
 */
test.describe.configure({ mode: "serial" });

test("submits and shows the result", async ({ page }) => {
  await page.goto("/actions");

  await page.getByLabel("Review").fill("A perfectly adequate keyboard");
  await page.getByRole("button", { name: "Post the review" }).click();

  await expect(page.getByTestId("action-result")).toHaveText("Thank you.");
  await expect(page.getByTestId("added-reviews")).toContainText("perfectly adequate");
});

test("validates on the server, not only in the browser", async ({ page }) => {
  await page.goto("/actions");

  // Long enough to clear the input's own minLength, so the server's rule is
  // what rejects it.
  await page.getByLabel("Review").fill("nope!");
  await page.getByRole("button", { name: "Post the review" }).click();

  await expect(page.getByTestId("action-result")).toBeVisible();
});

test("works with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/actions");

  await page.getByLabel("Review").fill("Submitted with no JavaScript at all");
  await page.getByRole("button", { name: "Post the review" }).click();

  // A real POST and a re-render. Progressive enhancement as the default
  // rather than as extra work.
  await expect(page.getByTestId("added-reviews")).toContainText("no JavaScript at all", {
    timeout: 10_000,
  });

  await context.close();
});
