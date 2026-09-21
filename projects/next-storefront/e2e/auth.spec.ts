import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * `:visible`, because there are two of these forms in the DOM.
 *
 * The Suspense fallback is itself a working form, so that /sign-in works
 * without JavaScript. Once the streamed half arrives, React leaves the
 * fallback behind in a `<div hidden>` template. Both match by test id and
 * strict mode refuses to choose. The leftover is inert and screen readers
 * skip it, so this is a locator problem, not a bug.
 */
function form(page: Page) {
  return page.locator('[data-testid="sign-in-form"]:visible');
}

test.describe("the protected route", () => {
  test("redirects to sign-in and remembers where you were going", async ({ page }) => {
    await page.goto("/orders");

    await expect(page).toHaveURL("/sign-in?next=%2Forders");
    await expect(form(page)).toBeVisible();
  });

  test("lets you in and sends you where you were going", async ({ page }) => {
    await page.goto("/orders");
    await form(page).getByLabel("Email").fill("person@example.com");
    await form(page).getByTestId("sign-in").click();

    await expect(page).toHaveURL("/orders");
    await expect(page.getByTestId("signed-in-as")).toContainText("person@example.com");
  });

  test("refuses to redirect off the site after signing in", async ({ page }) => {
    await page.goto("/sign-in?next=https://example.com/phishing");
    await form(page).getByLabel("Email").fill("person@example.com");
    await form(page).getByTestId("sign-in").click();

    // An open redirect is a link from your own domain that sends people
    // somewhere else, right after they have typed their credentials.
    await expect(page).toHaveURL("/orders");
  });

  test("does not let a forged cookie past the page, only past the middleware", async ({
    page,
    context,
  }) => {
    await context.addCookies([{ name: "session", value: "made.up", url: "http://localhost:5220" }]);

    await page.goto("/orders");

    // The middleware only checks the cookie exists, so this gets through
    // the gate. The page verifies the signature, which is why it does not
    // get through the door.
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("signs out without any JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto("/sign-in");
    await form(page).getByLabel("Email").fill("person@example.com");
    await form(page).getByTestId("sign-in").click();
    await expect(page.getByTestId("signed-in-as")).toBeVisible();

    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL("/");

    await page.goto("/orders");
    await expect(page).toHaveURL(/\/sign-in/);

    await context.close();
  });

  test("leaves the rest of the site alone", async ({ page }) => {
    // The matcher is /orders/:path*. Matching everything and filtering in
    // code runs middleware on every script and image too.
    await page.goto("/products");

    await expect(page).toHaveURL("/products");
  });

  test("has no axe violations on either page", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(form(page)).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);

    await form(page).getByLabel("Email").fill("person@example.com");
    await form(page).getByTestId("sign-in").click();
    await expect(page.getByTestId("signed-in-as")).toBeVisible();

    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  });
});
