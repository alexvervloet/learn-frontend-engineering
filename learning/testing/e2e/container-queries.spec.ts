import { expect, test } from "@playwright/test";

/**
 * The claim from `learning/styling` lesson 04: a card laid out with a container
 * query responds to the width of its container, not the viewport.
 *
 * jsdom cannot check this. It does no layout, implements no `@container`, and
 * `getComputedStyle` would report the same thing at every width. A real browser
 * can, and this is the only kind of test that can tell the CSS version from the
 * JavaScript one.
 */
test.beforeEach(async ({ page }) => {
  await page.goto("/#04-container-queries");
  await expect(page.getByRole("heading", { name: "Container queries" })).toBeVisible();
});

test("stacks when the container is narrow and not when it is wide", async ({ page }) => {
  const slider = page.getByLabel("Container width");
  const card = page.getByTestId("css-card");

  await slider.fill("260");
  // flex-direction is the property the container query sets. Reading the
  // computed value is the assertion jsdom could not make.
  await expect(card).toHaveCSS("flex-direction", "column");

  await slider.fill("560");
  await expect(card).toHaveCSS("flex-direction", "row");
});

test("responds to the container, not the window", async ({ page }) => {
  const card = page.getByTestId("css-card");

  await page.getByLabel("Container width").fill("560");
  await expect(card).toHaveCSS("flex-direction", "row");

  // Shrink the viewport hard. A media query would have flipped by now.
  await page.setViewportSize({ width: 420, height: 800 });

  await expect(card).toHaveCSS("flex-direction", "row");
});

test("the JavaScript version reaches the same layout, a frame later", async ({ page }) => {
  const observed = page.getByTestId("observed-card");

  await page.getByLabel("Container width").fill("560");

  await expect(observed).toHaveAttribute("data-layout", "side-by-side");
  await expect(observed).toHaveCSS("flex-direction", "row");
});
