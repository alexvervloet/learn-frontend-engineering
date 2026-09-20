import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

/**
 * The two or three journeys that must not break. Not every validation
 * message: those are covered in jsdom in milliseconds, and duplicating them
 * here buys a slower suite and nothing else.
 */
test("sign in, browse, and open a bookmark", async ({ page }) => {
  await signIn(page);

  await expect(page.getByTestId("bookmarks").getByRole("listitem")).toHaveCount(5);

  await page.getByRole("link", { name: "You Might Not Need an Effect" }).click();

  await expect(page.getByRole("heading", { name: "You Might Not Need an Effect" })).toBeVisible();
  await expect(page.getByTestId("clicks")).toContainText("12 clicks");
});

test("a wrong password is reported and does not get you in", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Password").fill("wrong");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toContainText("Incorrect username or password");
  await expect(page.getByRole("heading", { name: "Bookmarks" })).toBeHidden();
});

test("filters live in the URL, so Back works and the link is shareable", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: "css", exact: true }).click();

  await expect(page).toHaveURL(/\?tag=css$/);
  await expect(page.getByTestId("bookmarks").getByRole("listitem")).toHaveCount(1);

  await page.goBack();

  await expect(page).not.toHaveURL(/tag=css/);
  await expect(page.getByTestId("bookmarks").getByRole("listitem")).toHaveCount(5);
});

test("adding a bookmark shows it in the list afterwards", async ({ page }) => {
  await signIn(page);

  await page.getByRole("link", { name: "Add" }).click();
  await page.getByLabel("Title").fill("Playwright docs");
  await page.getByLabel("URL").fill("https://playwright.dev");
  await page.getByLabel("Tags").fill("testing");
  await page.getByRole("button", { name: "Add it" }).click();

  await expect(page.getByRole("heading", { name: "Playwright docs" })).toBeVisible();

  await page.getByRole("link", { name: "All" }).click();
  // Nothing told the list to refetch; the mutation invalidated the key.
  await expect(page.getByRole("link", { name: "Playwright docs" })).toBeVisible();
});

test("a favourite reaches the server, not just the screen", async ({ page }) => {
  await signIn(page);

  await page.getByRole("button", { name: "Favourite TanStack Query" }).click();
  // Instant, because it is optimistic. Proves nothing on its own.
  await expect(page.getByRole("button", { name: "Unfavourite TanStack Query" })).toBeVisible();

  // The detail page is a different query with a different key, so it can
  // only show the star if the PATCH landed and the cache was invalidated.
  await page.getByRole("link", { name: "TanStack Query" }).click();
  await expect(page.getByRole("button", { name: "★ Favourited" })).toBeVisible();

  // Not asserted here: that it survives a reload. The mock API keeps its
  // data in the page's own memory, so a reload reseeds it. That assertion
  // belongs against the real Express backend, and the note in the README
  // says how to point this at one.
});

test("a deep link works on a cold load", async ({ page }) => {
  // The nginx and vite-preview SPA fallback. Without it this is a 404 while
  // navigating there from the list works fine.
  await page.goto("/bookmarks/2");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "TanStack Query" })).toBeVisible({
    timeout: 15_000,
  });
});
