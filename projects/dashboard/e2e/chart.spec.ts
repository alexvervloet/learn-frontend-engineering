import { expect, test } from "@playwright/test";

/**
 * The hover layer maps a client x back through the SVG's bounding box. jsdom
 * reports that box as zero-width, so the mapping divides by zero there and
 * the whole interaction is untestable outside a browser.
 */
test.describe("the hover layer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows a crosshair and the day's numbers under the pointer", async ({ page }) => {
    const chart = page.getByTestId("chart");
    await expect(page.getByTestId("crosshair")).toHaveCount(0);

    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);

    // Attached, not visible: a vertical line is zero pixels wide and
    // Playwright calls a zero-area box hidden.
    await expect(page.getByTestId("crosshair")).toBeAttached();
    await expect(page.getByTestId("tooltip")).toContainText(/Direct/);
    await expect(page.getByTestId("tooltip")).not.toContainText(/hover the chart/i);
  });

  test("reads a different day when the pointer moves a long way", async ({ page }) => {
    const chart = page.getByTestId("chart");
    const box = (await chart.boundingBox())!;

    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2);
    const left = await page.getByTestId("tooltip").textContent();

    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);

    expect(await page.getByTestId("tooltip").textContent()).not.toBe(left);
  });

  test("clears when the pointer leaves, instead of freezing on the last day", async ({ page }) => {
    const box = (await page.getByTestId("chart").boundingBox())!;

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId("crosshair")).toBeAttached();

    await page.mouse.move(box.x + box.width / 2, box.y - 60);

    await expect(page.getByTestId("crosshair")).toHaveCount(0);
    await expect(page.getByTestId("tooltip")).toContainText(/hover the chart/i);
  });

  test("reserves the tooltip's space, so hovering does not shift the page", async ({ page }) => {
    const table = page.getByRole("heading", { name: "Recent events" });
    const before = (await table.boundingBox())!.y;

    const box = (await page.getByTestId("chart").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByTestId("crosshair")).toBeAttached();

    expect((await table.boundingBox())!.y).toBe(before);
  });
});

test.describe("the chart's geometry", () => {
  test("has end labels inside the plot, not clipped by it", async ({ page }) => {
    await page.goto("/");

    const chart = (await page.getByTestId("chart").boundingBox())!;

    for (const channel of ["direct", "search", "referral"]) {
      const label = (await page.getByTestId(`end-label-${channel}`).boundingBox())!;

      expect(label.x + label.width).toBeLessThanOrEqual(chart.x + chart.width + 1);
      expect(label.y).toBeGreaterThanOrEqual(chart.y - 1);
    }
  });

  test("keeps the end labels from overlapping each other", async ({ page }) => {
    await page.goto("/");

    const boxes = await Promise.all(
      ["direct", "search", "referral"].map(async (channel) =>
        page.getByTestId(`end-label-${channel}`).boundingBox(),
      ),
    );

    // Three labels stacked on top of each other is the classic direct-label
    // failure, and no unit test can see it.
    for (const [a, b] of [
      [boxes[0]!, boxes[1]!],
      [boxes[1]!, boxes[2]!],
      [boxes[0]!, boxes[2]!],
    ]) {
      const overlaps =
        a.y < b.y + b.height && b.y < a.y + a.height && a.x < b.x + b.width && b.x < a.x + a.width;
      expect(overlaps).toBe(false);
    }
  });

  test("does not overflow its container at a narrow width", async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 900 });
    await page.goto("/");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(overflow).toBeLessThanOrEqual(0);
  });
});
