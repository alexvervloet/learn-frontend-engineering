import { expect, test } from "@playwright/test";

/**
 * The claim from `learning/styling` lesson 05: layer order is resolved before
 * specificity, so a single-class selector in a later layer beats a
 * three-class selector in an earlier one.
 *
 * jsdom implements no `@layer` at all, so its tests could only assert that the
 * stylesheet *says* the right thing. This asserts the browser *does* the right
 * thing, which is a different claim.
 */
test("the weakest selector wins, because its layer is last", async ({ page }) => {
  await page.goto("/#05-cascade-layers");

  const element = page.getByTestId("layered");
  await expect(element).toBeVisible();

  // .demo-accent is 0-1-0 and in demo-utilities.
  // .demo-box.demo-box.demo-box is 0-3-0 and in demo-reset.
  // The accent colour is what renders.
  const background = await element.evaluate((node) => getComputedStyle(node).backgroundColor);
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-brand-500").trim(),
  );

  expect(accent).not.toBe("");
  // Both resolve to the same colour once the browser has computed them.
  const asRendered = await page.evaluate((value) => {
    const probe = document.createElement("div");
    probe.style.color = value;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, accent);

  expect(background).toBe(asRendered);
});

test("an unlayered rule beats every layer", async ({ page }) => {
  await page.goto("/#05-cascade-layers");

  const element = page.getByTestId("unlayered");
  await expect(element).toBeVisible();

  // .demo-override is in no layer, so its outline applies over the layered
  // background rules with no !important anywhere.
  await expect(element).toHaveCSS("outline-style", "dashed");
});
