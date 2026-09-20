import { expect, type Page } from "@playwright/test";

/**
 * Signs in through the real form.
 *
 * Not by injecting a token: the sign-in path is part of what these specs are
 * for, and a helper that bypasses it would let it break unnoticed.
 */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Password").fill("correct-horse");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Bookmarks" })).toBeVisible({ timeout: 15_000 });
}

/**
 * Navigates inside the app, by clicking.
 *
 * `page.goto` is a full reload, and this app keeps its access token in
 * memory on purpose, so a reload signs you out and lands on the form. That
 * is the app behaving correctly; the tests have to navigate the way a user
 * does. The one spec that uses `goto` after signing in is the deep-link
 * test, which signs in again afterwards on purpose.
 */
export async function openFirstBookmark(page: Page): Promise<void> {
  await page.getByRole("link", { name: "You Might Not Need an Effect" }).click();
  await expect(page.getByRole("heading", { name: "You Might Not Need an Effect" })).toBeVisible();
}

export async function openAddForm(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Add" }).click();
  await expect(page.getByRole("heading", { name: "Add a bookmark" })).toBeVisible();
}
