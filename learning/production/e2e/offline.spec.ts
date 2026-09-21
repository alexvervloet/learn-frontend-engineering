import { expect, test, type Page } from "@playwright/test";

/**
 * The half of lesson 08 that only a browser can settle.
 *
 * jsdom has no service worker, no Cache Storage and no way to go offline, so
 * the unit suite covers the strategy rules, the cache cleanup and the manifest
 * check. This covers the claim those exist to support: that the app comes back
 * with the network switched off.
 *
 * It also covers the one from `web-fundamentals` lesson 04, which says Cache
 * Storage is the thing a service worker serves offline from and cannot prove
 * it in jsdom.
 */

/** Installs the worker and waits until it is actually controlling the page. */
async function installWorker(page: Page): Promise<void> {
  await page.goto("/#08-offline");
  await page.getByTestId("register").click();
  await expect(page.getByTestId("registration")).toContainText("registered");

  // `registered` is not `controlling`. The worker has to activate and claim
  // the client, and a reload is the reliable way to be sure, because a page
  // loaded before the worker existed is not controlled by it.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test.beforeEach(async ({ page, context }) => {
  // Each test starts with nothing cached, or the second one passes because
  // the first one warmed the cache.
  await context.setOffline(false);
  await page.goto("/");
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  });
});

test("the page works before any of this, which is the whole point of the word progressive", async ({
  page,
}) => {
  // A reload, because unregistering in beforeEach does not release the page
  // that is already loaded: a client keeps its controller until it navigates.
  // Without this the assertion below fails on whichever test ran first, which
  // is the kind of order dependence that only shows up in CI.
  await page.reload();
  await page.goto("/#08-offline");

  await expect(page.getByTestId("strategy-/api/flags")).toContainText("network-only");
  // No worker, no cache, no manifest needed.
  expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
});

test("registers and takes control of the page", async ({ page }) => {
  await installWorker(page);

  const scope = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
  expect(scope).toContain("/sw.js");
});

test("precaches the shell into Cache Storage", async ({ page }) => {
  await installWorker(page);

  // The claim web-fundamentals lesson 04 makes and cannot check: Cache
  // Storage holds whole Responses, keyed by request.
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const shell = names.find((name) => name.startsWith("shell-"));
    if (shell === undefined) return null;

    const cache = await caches.open(shell);
    const hit = await cache.match("/index.html");
    if (hit === undefined) return null;

    return { status: hit.status, type: hit.headers.get("content-type") };
  });

  expect(cached).not.toBeNull();
  expect(cached?.status).toBe(200);
  expect(cached?.type).toContain("text/html");
});

test("serves the app with the network switched off", async ({ page, context }) => {
  await installWorker(page);

  // Warm the asset cache by loading the page once more online.
  await page.reload();
  await expect(page.getByTestId("register")).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  // The whole app, from disk. Not a browser error page.
  await expect(page.getByTestId("register")).toBeVisible();
  await expect(page.getByTestId("strategy-/api/flags")).toContainText("network-only");
});

test("reports itself offline to the app", async ({ page, context }) => {
  await installWorker(page);
  await page.reload();

  await context.setOffline(true);
  // navigator.onLine is a weak signal, but it is the one the badge uses.
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));

  await expect(page.getByTestId("online")).toHaveText("offline");
});

test("does not answer an API call from the cache", async ({ page, context }) => {
  // The most common service worker bug: a cached API response that will not
  // update. The strategy table says network-only, and this is that claim
  // against a browser rather than against a pure function.
  await installWorker(page);
  await page.reload();

  await context.setOffline(true);

  const result = await page.evaluate(async () => {
    try {
      await fetch("/api/flags");
      return "answered";
    } catch {
      return "failed";
    }
  });

  // Offline and uncached, so it must fail rather than serving something stale.
  expect(result).toBe("failed");
});

test("the manifest is installable", async ({ page }) => {
  await page.goto("/#08-offline");
  await page.getByTestId("check-manifest").click();

  await expect(page.getByTestId("manifest")).toContainText("installable");
});

test("deletes the previous version's caches on activate", async ({ page }) => {
  // Plant a cache from an imaginary older deploy *before* installing, so the
  // worker's activate handler is what clears it.
  //
  // The obvious version of this test installs first and then calls
  // `registration.update()`, and it does not work: sw.js is byte-identical,
  // so the browser finds no new worker, nothing installs, and activate never
  // runs again. Which is itself the thing to know. A service worker only
  // re-activates when its bytes change, so a VERSION constant that nobody
  // bumps means the cleanup never happens.
  await page.goto("/");
  await page.evaluate(async () => {
    const stale = await caches.open("shell-v0");
    await stale.put("/index.html", new Response("old"));
  });
  expect(await page.evaluate(() => caches.keys())).toContain("shell-v0");

  await installWorker(page);

  // Without the activate handler, every deploy leaves another full copy of
  // the app on disk until the browser evicts the origin entirely, taking the
  // data you did mean to keep with it.
  await expect
    .poll(async () => page.evaluate(() => caches.keys()), { timeout: 10_000 })
    .not.toContain("shell-v0");

  // And this version's caches are there, so it deleted the right ones.
  expect(await page.evaluate(() => caches.keys())).toContain("shell-v1");
});
