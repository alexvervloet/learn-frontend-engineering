import { expect, test } from "@playwright/test";

import { PORTS } from "../../../config/ports.ts";

/**
 * The claims from `learning/routing` lesson 06 that only a browser can settle.
 *
 * jsdom has no `startViewTransition`, no `::view-transition-*` pseudo-elements
 * and no animations, so the unit suite covers the fallback path, the promise
 * handling and the stylesheet. This covers the two things that matter and
 * cannot be faked: that a transition runs at all, and that a duplicated
 * `view-transition-name` silently cancels it.
 *
 * The second is the important one. It is the most common way this feature
 * fails, the page still works afterwards, and the only sign is a console error
 * nobody is looking at. Asserting the exact wording is deliberate: "the
 * browser warns you about this" is a claim with a shelf life, and if Chromium
 * ever stops, this is where it surfaces rather than in prose that has been
 * wrong for two years.
 */
test.use({ baseURL: `http://localhost:${PORTS.routing}` });

test.describe("view transitions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#06-view-transitions");
    await expect(page.getByTestId("vt-support")).toContainText("startViewTransition: yes");
  });

  test("runs a transition when the panel toggles", async ({ page }) => {
    // Count the transitions by wrapping the API before anything calls it.
    // Asserting on the pseudo-elements is not possible: they exist only
    // during the animation and are not in the DOM.
    await page.evaluate(() => {
      const target = document as Document & { __vt?: number };
      target.__vt = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (callback) => {
        target.__vt = (target.__vt ?? 0) + 1;
        return original(callback as () => void);
      };
    });

    await page.getByTestId("vt-toggle").click();
    await expect(page.getByTestId("vt-panel")).toContainText("Expanded.");

    expect(await page.evaluate(() => (document as Document & { __vt?: number }).__vt)).toBe(1);
  });

  test("a duplicated view-transition-name cancels it, and Chromium says so", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    // Adds a second element carrying `view-transition-name: card`.
    await page.getByTestId("vt-duplicate").click();
    await expect(page.getByTestId("vt-duplicate-panel")).toBeVisible();

    // Two elements, one name.
    const named = page.locator('[style*="view-transition-name: card"]');
    await expect(named).toHaveCount(2);

    // `ready` rejects when the transition is skipped. Ask the browser
    // directly rather than trying to observe an animation that did not run.
    //
    // Only that it rejected, not what it said. The reason races: usually
    // "Snapshot capture failed", but if the toggle's own transition has not
    // finished it is "Transition was skipped. New ViewTransition started"
    // instead. Asserting the message failed about one run in three, which is
    // worse than not asserting it, and the claim was never about the wording.
    const outcome = await page.evaluate(async () => {
      const transition = document.startViewTransition(() => {
        document.body.dataset["probe"] = "changed";
      });
      try {
        await transition.ready;
        return "animated";
      } catch {
        return "skipped";
      } finally {
        await transition.finished.catch(() => undefined);
      }
    });

    expect(outcome).toBe("skipped");

    // The DOM update still happened. Nothing was thrown, no error boundary
    // fired and no request failed, which is what makes this hard to notice:
    // the app is correct and only the animation is missing.
    await expect(page.locator("body")).toHaveAttribute("data-probe", "changed");

    // The one sign you get, and it is a console error rather than an
    // exception. This exact wording is the string to search for when a
    // transition mysteriously stops animating.
    expect(errors.join("\n")).toContain("Unexpected duplicate view-transition-name: card");
  });

  test("names only the row being navigated to", async ({ page }) => {
    // At rest every row is `none`, because useViewTransitionState is false
    // for all of them. If a CSS rule named .vt-card instead, all three would
    // carry the name at once and every navigation would skip.
    const named = page.locator('[data-testid^="link-"][style*="view-transition-name: item"]');
    await expect(named).toHaveCount(0);

    await page.getByTestId("link-swift").click();
    await expect(page.getByTestId("detail-name")).toHaveText("Swift");
  });

  test("still navigates in a browser with the API removed", async ({ page }) => {
    // Firefox and older Safari. The required behaviour is no animation and
    // the same result, not a broken page.
    await page.addInitScript(() => {
      Reflect.deleteProperty(Document.prototype, "startViewTransition");
      Reflect.deleteProperty(document, "startViewTransition");
    });

    // `reload`, not another `goto` to the same hash. The beforeEach already
    // navigated here, and a second goto differing only in the fragment is a
    // same-document navigation: no new document, so an init script never
    // runs. The first version of this test asserted "no" against a page that
    // still had the API, and passed for the wrong reason until it did not.
    await page.reload();

    await expect(page.getByTestId("vt-support")).toContainText("startViewTransition: no");

    await page.getByTestId("vt-toggle").click();
    await expect(page.getByTestId("vt-panel")).toContainText("Expanded.");

    await page.getByTestId("link-wren").click();
    await expect(page.getByTestId("detail-name")).toHaveText("Wren");
  });
});
