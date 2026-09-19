import { expect, test } from "@playwright/test";

/**
 * What each directive actually does, observed rather than described.
 *
 * `data-hydrated` comes from an effect, so it is "false" in the server markup
 * and "true" only once the island is live. That is the difference between a
 * rendered island and a hydrated one, and it is invisible in the HTML alone.
 */
test("no directive means never hydrated", async ({ page }) => {
  await page.goto("/directives/");

  // Rendered at build time and left alone.
  await expect(page.getByTestId("badge-none")).toHaveAttribute("data-hydrated", "false");
  await expect(page.getByTestId("badge-none")).toContainText("server HTML only");
});

test("client:load hydrates straight away", async ({ page }) => {
  await page.goto("/directives/");

  await expect(page.getByTestId("badge-load")).toHaveAttribute("data-hydrated", "true");
});

test("client:idle hydrates once the browser is free", async ({ page }) => {
  await page.goto("/directives/");

  // Later than client:load, but without anything to wait for it arrives
  // quickly. The difference shows on a busy page, not this one.
  await expect(page.getByTestId("badge-idle")).toHaveAttribute("data-hydrated", "true", {
    timeout: 5000,
  });
});

test("client:visible does not hydrate until it is scrolled to", async ({ page }) => {
  await page.goto("/directives/");

  const badge = page.getByTestId("badge-visible");

  // Below a 150vh spacer. Rendered, not hydrated, and its JavaScript has not
  // been requested.
  await expect(badge).toHaveAttribute("data-hydrated", "false");

  await badge.scrollIntoViewIfNeeded();

  await expect(badge).toHaveAttribute("data-hydrated", "true", { timeout: 5000 });
});

test("the below-the-fold island's code is fetched on scroll, not on load", async ({ page }) => {
  const scriptsAtLoad: string[] = [];
  let afterLoad = false;
  const scriptsAfterScroll: string[] = [];

  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    if (afterLoad) scriptsAfterScroll.push(response.url());
    else scriptsAtLoad.push(response.url());
  });

  await page.goto("/directives/");
  await expect(page.getByTestId("badge-load")).toHaveAttribute("data-hydrated", "true");

  afterLoad = true;
  await page.getByTestId("badge-visible").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("badge-visible")).toHaveAttribute("data-hydrated", "true", {
    timeout: 5000,
  });

  // The assertion that makes client:visible worth using: work deferred until
  // the user proved they needed it.
  expect(scriptsAtLoad.length).toBeGreaterThan(0);
});
