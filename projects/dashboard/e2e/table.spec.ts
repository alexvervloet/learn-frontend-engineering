import { expect, test } from "@playwright/test";

/**
 * Everything here needs layout. jsdom reports every element as zero pixels
 * tall, so the unit tests stub the scroller's height and can only check the
 * component's arithmetic. How many rows a browser actually paints is a
 * question only a browser answers.
 */
test.describe("the virtualised table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("paints a couple of dozen rows out of ten thousand", async ({ page }) => {
    const grid = page.getByTestId("event-grid");
    await expect(grid).toHaveAttribute("aria-rowcount", "10000");

    const painted = await grid.getByRole("row").count();

    // A 420px viewport at 36px a row is 12 visible, plus 8 overscan either
    // side, plus the header. Generous bounds: the point is the order of
    // magnitude, not the exact number, which changes with the overscan.
    expect(painted).toBeGreaterThan(10);
    expect(painted).toBeLessThan(40);
  });

  test("replaces the rows as you scroll rather than adding to them", async ({ page }) => {
    const grid = page.getByTestId("event-grid");
    const first = await grid.getByRole("row").nth(1).getAttribute("aria-rowindex");

    await page.getByTestId("event-grid").evaluate((node) => {
      node.scrollTop = 36 * 500;
    });
    await expect(grid.getByRole("row").nth(1)).not.toHaveAttribute("aria-rowindex", first!);

    expect(await grid.getByRole("row").count()).toBeLessThan(40);
  });

  test("scrolls the active row into view when the keyboard runs past the window", async ({
    page,
  }) => {
    const grid = page.getByTestId("event-grid");
    await grid.focus();
    await page.keyboard.press("End");

    // The row the grid points at has to exist in the DOM, or a screen
    // reader following aria-activedescendant is pointed at nothing. This is
    // the failure mode virtualisation introduces.
    // An attribute selector, not `#${id}`: useId generates ids like
    // "_r_2_-499", which is not a valid bare CSS id selector, and CSS.escape
    // does not exist in the Node process the test runs in.
    const active = await grid.getAttribute("aria-activedescendant");
    await expect(page.locator(`[id="${active}"]`)).toBeVisible();
    await expect(grid.getByRole("row").last()).toHaveAttribute("aria-rowindex", "10001");
  });

  test("moves one row at a time with the arrow keys and ten with Page Down", async ({ page }) => {
    const grid = page.getByTestId("event-grid");
    await grid.focus();

    const indexOf = async () => {
      const id = await grid.getAttribute("aria-activedescendant");
      return Number(id!.split("-").at(-1));
    };

    await page.keyboard.press("ArrowDown");
    expect(await indexOf()).toBe(1);

    await page.keyboard.press("PageDown");
    expect(await indexOf()).toBe(11);
  });

  test("is a single tab stop, so Tab gets past it", async ({ page }) => {
    await page.getByTestId("event-grid").focus();
    await page.keyboard.press("Tab");

    await expect(page.getByTestId("event-grid")).not.toBeFocused();
    // Ten thousand focusable rows would make this an unescapable trap, and
    // the naive virtualised table is exactly that.
    await expect(page.locator(":focus")).toHaveCount(1);
  });

  test("keeps the header visible while the body scrolls", async ({ page }) => {
    const header = page.getByRole("row").first();
    const before = await header.boundingBox();

    await page.getByTestId("event-grid").evaluate((node) => {
      node.scrollTop = 4000;
    });

    expect((await header.boundingBox())?.y).toBe(before?.y);
  });
});
