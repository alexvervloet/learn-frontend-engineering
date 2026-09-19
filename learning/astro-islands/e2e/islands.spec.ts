import { expect, test } from "@playwright/test";

/** Two islands, hydrated independently, with no way to share state. */
test("each island works on its own", async ({ page }) => {
  await page.goto("/islands/");

  await page.getByRole("button", { name: "First island plus" }).click();
  await page.getByRole("button", { name: "First island plus" }).click();

  await expect(page.getByTestId("first-value")).toHaveText("2");
});

test("they do not share state, which is the constraint to weigh", async ({ page }) => {
  await page.goto("/islands/");

  await page.getByRole("button", { name: "First island plus" }).click();

  // Separate React roots. No context, no store, no common parent.
  await expect(page.getByTestId("first-value")).toHaveText("1");
  await expect(page.getByTestId("second-value")).toHaveText("0");
});

test("the static content between them needed no framework", async ({ request }) => {
  const html = await (await request.get("/islands/")).text();

  // Plain HTML in the response, not something React produced at runtime.
  expect(html).toContain("Static content between them");
});

test("this page does load JavaScript, because it asked for some", async ({ page }) => {
  const scripts: string[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script") scripts.push(response.url());
  });

  await page.goto("/islands/");
  await expect(page.getByTestId("first-value")).toHaveText("0");

  // The contrast with /static. Two islands means React plus the component,
  // and nothing for the static half of the page.
  expect(scripts.length).toBeGreaterThan(0);
});
