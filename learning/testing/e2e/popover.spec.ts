import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

/**
 * The claims from `learning/styling` lesson 08 that jsdom cannot check.
 *
 * jsdom has no popover API: no `showPopover`, no top layer, no
 * `:popover-open`, and its `CSS.supports` answers `true` to anchor positioning
 * it does not implement. So the unit suite asserts the markup and the
 * stylesheet, and this asserts the behaviour those are supposed to produce.
 *
 * Runs against the styling module, which is this config's default baseURL.
 */

/**
 * Waits for the open transition to finish before anything measures geometry.
 *
 * The popover slides 4px as it fades in, so a `boundingBox()` taken straight
 * after the click is a reading from the middle of an animation. Every
 * positioning assertion below was written before there was an animation and
 * two of them started failing by a few pixels the moment there was one, which
 * is the right failure: they were measuring a moving element.
 *
 * Opacity is the settle signal because it shares the duration and easing with
 * the transform, so opacity 1 means the transform has arrived too.
 */
async function settled(page: import("@playwright/test").Page): Promise<void> {
  await expect
    .poll(
      async () =>
        Number(
          await page.getByTestId("anchored-tip").evaluate((node) => getComputedStyle(node).opacity),
        ),
      { timeout: 5_000 },
    )
    .toBe(1);
}

test.describe("the Popover API", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#08-popover-anchor");
    await expect(page.getByTestId("support")).toContainText("popover: yes");
  });

  test("opens from an attribute, with no click handler anywhere", async ({ page }) => {
    const tip = page.getByTestId("anchored-tip");
    await expect(tip).toBeHidden();

    await page.getByTestId("open-anchored").click();

    await expect(tip).toBeVisible();

    // The pseudo-class the platform adds while it is open. That is how CSS
    // styles the open state without anyone toggling a class.
    expect(await tip.evaluate((node) => node.matches(":popover-open"))).toBe(true);
  });

  test("sits in the top layer, above an overflow:hidden ancestor", async ({ page }) => {
    // The reason the platform feature replaces a portal plus a z-index fight.
    await page.getByTestId("open-anchored").click();
    const tip = page.getByTestId("anchored-tip");
    await expect(tip).toBeVisible();

    const box = await tip.boundingBox();
    expect(box).not.toBeNull();

    // Hit-test the popover's own centre: the top-layer element is what the
    // browser says is there, not whatever is painted underneath it.
    const onTop = await page.evaluate(
      ({ x, y }) => {
        const found = document.elementFromPoint(x, y);
        return found?.closest("[popover]")?.id ?? null;
      },
      { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + 8 },
    );

    expect(onTop).toBe("anchored-tip");
  });

  test("closes on Escape and gives focus back to the trigger", async ({ page }) => {
    const trigger = page.getByTestId("open-anchored");
    const tip = page.getByTestId("anchored-tip");

    await trigger.click();
    await expect(tip).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(tip).toBeHidden();
    // Focus returning to the invoker is the part hand-rolled dropdowns skip,
    // and it is the difference between usable and unusable with a keyboard.
    await expect(trigger).toBeFocused();
  });

  test("closes on an outside click", async ({ page }) => {
    const tip = page.getByTestId("anchored-tip");

    await page.getByTestId("open-anchored").click();
    await expect(tip).toBeVisible();

    // Somewhere that is not the popover and not the trigger.
    await page.locator("h3").first().click();

    await expect(tip).toBeHidden();
  });

  test("a manual popover ignores Escape and an outside click", async ({ page }) => {
    const note = page.getByTestId("manual-note");

    await page.getByTestId("toggle-manual").click();
    await expect(note).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(note).toBeVisible();

    await page.locator("h3").first().click();
    await expect(note).toBeVisible();

    // It closes when asked, and only then.
    await page.getByTestId("toggle-manual").click();
    await expect(note).toBeHidden();
  });

  test("one auto popover closes another, because they share a stack", async ({ page }) => {
    const tip = page.getByTestId("anchored-tip");
    const note = page.getByTestId("manual-note");

    // manual first, so it is open while the auto one opens.
    await page.getByTestId("toggle-manual").click();
    await page.getByTestId("open-anchored").click();

    await expect(tip).toBeVisible();
    // manual is not in the auto stack, so it survives. That is the whole
    // difference between the two kinds.
    await expect(note).toBeVisible();
  });
});

test.describe("anchor positioning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#08-popover-anchor");
  });

  test("puts the popover under the button that opened it", async ({ page }) => {
    test.skip(
      !(await page.evaluate(() => CSS.supports("anchor-name", "--probe"))),
      "this browser has popover but not anchor positioning, which the CSS has a fallback for",
    );

    const trigger = page.getByTestId("open-anchored");
    await trigger.click();

    const tip = page.getByTestId("anchored-tip");
    await expect(tip).toBeVisible();
    await settled(page);

    const triggerBox = await trigger.boundingBox();
    const tipBox = await tip.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(tipBox).not.toBeNull();

    // Below it, with the half-rem gap the stylesheet asks for.
    expect(tipBox?.y ?? 0).toBeGreaterThan((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0));

    // Horizontally overlapping, which is what `position-area: block-end`
    // means. A popover that is 600px away is the failure this catches, and it
    // is what you get from a typo in the anchor name.
    const triggerCentre = (triggerBox?.x ?? 0) + (triggerBox?.width ?? 0) / 2;
    const tipLeft = tipBox?.x ?? 0;
    const tipRight = tipLeft + (tipBox?.width ?? 0);
    expect(triggerCentre).toBeGreaterThanOrEqual(tipLeft);
    expect(triggerCentre).toBeLessThanOrEqual(tipRight);
  });

  test("stays with the button when the page scrolls", async ({ page }) => {
    test.skip(
      !(await page.evaluate(() => CSS.supports("anchor-name", "--probe"))),
      "no anchor positioning in this browser",
    );

    const trigger = page.getByTestId("open-anchored");
    await trigger.click();
    const tip = page.getByTestId("anchored-tip");
    await expect(tip).toBeVisible();
    await settled(page);

    const before = await trigger.boundingBox();
    const beforeTip = await tip.boundingBox();
    const offsetBefore = (beforeTip?.y ?? 0) - (before?.y ?? 0);

    await page.mouse.wheel(0, 200);
    // No scroll listener anywhere in the lesson. The browser keeps them
    // together, which is the entire point over a measuring loop.
    await page.waitForTimeout(150);

    const after = await trigger.boundingBox();
    const afterTip = await tip.boundingBox();
    const offsetAfter = (afterTip?.y ?? 0) - (after?.y ?? 0);

    expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(2);
  });
});

/**
 * The fallback, and why it needs a test of its own.
 *
 * `popover.css` carries an `@supports not (anchor-name: --probe)` block for a
 * browser that has the Popover API and not anchor positioning. That was a real
 * combination for about a year, and it is still real for anyone on an older
 * release.
 *
 * It is no longer reachable here. Anchor positioning is supported by all three
 * engines Playwright ships, and it cannot be switched off:
 * `--disable-blink-features=CSSAnchorPositioning` and its variants have no
 * effect now that it has shipped. So there is no browser available that takes
 * the branch.
 *
 * Skipping the whole thing would leave the block as asserted-but-never-run
 * CSS, which is how a fallback rots: nobody notices it stopped working because
 * nobody on the team is running a browser that reads it.
 *
 * So this applies the block's own declarations, parsed out of the real
 * stylesheet at test time rather than copied here, and checks the result is
 * usable. That is the part that can actually be wrong. Whether the `@supports`
 * gate is spelled correctly is checked structurally in the unit suite.
 */
const popoverCss = readFileSync(
  fileURLToPath(new URL("../../styling/src/popover.css", import.meta.url)),
  "utf8",
)
  // Comments stripped before anything is parsed. The block has a long one
  // inside it, and without this the parser below turned the prose into
  // declarations: `setProperty` silently ignored the nonsense keys, `inset:
  // auto` never reached the element, and the test failed for a reason that
  // had nothing to do with the CSS.
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations inside `@supports not (anchor-name: …) { .anchored-popover { … } }`. */
function fallbackDeclarations(): Record<string, string> {
  const block = /@supports not \(anchor-name:[^)]*\)\s*\{\s*\.anchored-popover\s*\{([^}]*)\}/.exec(
    popoverCss,
  );
  if (block === null) throw new Error("the @supports not fallback block is gone from popover.css");

  const declarations: Record<string, string> = {};
  for (const part of (block[1] ?? "").split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (property !== "" && value !== "") declarations[property] = value;
  }
  return declarations;
}

test.describe("the no-anchor-positioning fallback", () => {
  test("is still in the stylesheet, with something that positions", () => {
    // Parsed, not pattern-matched, so a block that exists and declares
    // nothing useful fails here rather than passing a `toMatch`.
    const declarations = fallbackDeclarations();

    expect(declarations["position"]).toBe("fixed");
    expect(Object.keys(declarations).length).toBeGreaterThan(1);
  });

  test("puts the popover somewhere usable when it is the branch that applies", async ({ page }) => {
    await page.goto("/#08-popover-anchor");
    await page.getByTestId("open-anchored").click();

    const tip = page.getByTestId("anchored-tip");
    await expect(tip).toBeVisible();
    await settled(page);

    // Take the anchored positioning away and apply the fallback's own
    // declarations, which is the state an older browser is in.
    await tip.evaluate((node, declarations: Record<string, string>) => {
      const element = node as HTMLElement;
      element.style.setProperty("position-anchor", "normal");
      element.style.setProperty("position-area", "none");
      element.style.setProperty("position-try-fallbacks", "none");
      for (const [property, value] of Object.entries(declarations)) {
        element.style.setProperty(property, value);
      }
    }, fallbackDeclarations());

    const box = await tip.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();

    const width = viewport?.width ?? 0;
    const height = viewport?.height ?? 0;

    // On screen, which is the whole requirement. Without the block a browser
    // with no anchor positioning leaves the popover wherever the UA default
    // put it, which is not wrong so much as unrelated to the button.
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(height);

    // Centred horizontally: `inset-inline-start: 50%` plus `translate: -50% 0`.
    const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(centre - width / 2)).toBeLessThan(4);

    // And its bottom edge a rem from the bottom of the viewport, which is
    // what `inset-block-end: 1rem` means. Asserting the *top* edge instead
    // would be asserting the popover's height, which is content.
    const bottomGap = height - ((box?.y ?? 0) + (box?.height ?? 0));
    expect(Math.abs(bottomGap - 16)).toBeLessThan(2);
  });

  test("still reaches the top layer, because that is the popover's job and not the CSS's", async ({
    page,
  }) => {
    // Worth separating: losing anchor positioning must not lose the thing
    // that made the feature worth using. The top layer comes from the
    // `popover` attribute, so the fallback cannot affect it.
    await page.goto("/#08-popover-anchor");
    await page.getByTestId("open-anchored").click();

    const tip = page.getByTestId("anchored-tip");
    await tip.evaluate((node, declarations: Record<string, string>) => {
      const element = node as HTMLElement;
      element.style.setProperty("position-anchor", "normal");
      element.style.setProperty("position-area", "none");
      for (const [property, value] of Object.entries(declarations)) {
        element.style.setProperty(property, value);
      }
    }, fallbackDeclarations());

    const box = await tip.boundingBox();
    const onTop = await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.closest("[popover]")?.id ?? null,
      { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + 8 },
    );

    expect(onTop).toBe("anchored-tip");
  });
});

/**
 * Entry and exit animation, which is the part of the Popover API that silently
 * does nothing when you get it wrong.
 *
 * A popover is `display: none` when closed, so a plain `transition: opacity`
 * never runs in either direction and the failure is no animation rather than a
 * broken one. Three things make it work, and each has a test here because each
 * fails invisibly on its own: `@starting-style` for the entry, `display` in
 * the transition with `allow-discrete` for the exit, and `overlay` with it so
 * the exit plays in the top layer rather than behind the page.
 *
 * **The transitions are slowed to 1500ms for these tests.** The real duration
 * is 180ms, which is fine for a person and far too short to sample reliably
 * from another process on a loaded CI machine. What is being asserted is the
 * mechanism, not the number, and the mechanism is identical at either speed.
 * The alternative is a test that passes on a fast machine and flakes on a
 * slow one, and this repo already has a LESSONS.md entry about that.
 */
test.describe("animating in and out", () => {
  const SLOW = 1500;

  test.beforeEach(async ({ page }) => {
    await page.goto("/#08-popover-anchor");
    await expect(page.getByTestId("support")).toContainText("popover: yes");
    await page.addStyleTag({
      content: `.anchored-popover { transition-duration: ${String(SLOW)}ms !important; }`,
    });
  });

  const opacityOf = async (page: import("@playwright/test").Page): Promise<number> =>
    Number(
      await page.getByTestId("anchored-tip").evaluate((node) => getComputedStyle(node).opacity),
    );

  test("fades in rather than appearing, which is @starting-style working", async ({ page }) => {
    await page.getByTestId("open-anchored").click();
    await page.waitForTimeout(250);

    // Without @starting-style there is no previous style to interpolate from,
    // the element's first rendered style is the open one, and this reads 1.
    const midway = await opacityOf(page);
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);

    await expect.poll(async () => opacityOf(page), { timeout: SLOW * 2 }).toBe(1);
  });

  test("stays on screen while it fades out, which is display allow-discrete", async ({ page }) => {
    const tip = page.getByTestId("anchored-tip");

    await page.getByTestId("open-anchored").click();
    await expect.poll(async () => opacityOf(page), { timeout: SLOW * 2 }).toBe(1);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);

    // Without `display 180ms allow-discrete` the element is display:none on
    // the first frame after closing and there is nothing left to animate.
    const display = await tip.evaluate((node) => getComputedStyle(node).display);
    expect(display).not.toBe("none");

    const fading = await opacityOf(page);
    expect(fading).toBeLessThan(1);
    expect(fading).toBeGreaterThan(0);

    // And it does finish.
    await expect(tip).toBeHidden({ timeout: SLOW * 2 });
  });

  /**
   * `overlay` is read directly rather than inferred from a hit test, and the
   * first version of this test got that wrong.
   *
   * Hit-testing the popover's centre mid-exit finds the section behind it, not
   * the popover, even though the popover is still painted on top at 75%
   * opacity. That is deliberate browser behaviour: a popover that is closing
   * stops being a pointer target, so a click during the fade goes to whatever
   * the user can see themselves about to click. Correct, and nothing to do
   * with the top layer.
   *
   * The computed value of `overlay` is the thing itself. `auto` means in the
   * top layer, `none` means out of it.
   */
  test("fades out in the top layer, not behind the page, which is overlay", async ({ page }) => {
    const tip = page.getByTestId("anchored-tip");

    await page.getByTestId("open-anchored").click();
    await expect.poll(async () => opacityOf(page), { timeout: SLOW * 2 }).toBe(1);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);

    const state = await tip.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        // `getPropertyValue`, not `style.overlay`. The property is real in
        // Chromium and is not in TypeScript's DOM lib yet, so the dotted
        // spelling is a type error. The lib trails the platform by a good
        // while on anything this new, and the string form is the escape
        // hatch that does not need an `as`.
        overlay: style.getPropertyValue("overlay"),
        opacity: style.opacity,
        stillOpen: node.matches(":popover-open"),
      };
    });

    // Closing, still fading, still in the top layer. Take `overlay` out of the
    // transition and this reads "none" while the opacity is still above zero,
    // which is the fade happening behind the page.
    expect(state.stillOpen).toBe(false);
    expect(Number(state.opacity)).toBeGreaterThan(0);
    expect(Number(state.opacity)).toBeLessThan(1);
    expect(state.overlay).toBe("auto");
  });
});
