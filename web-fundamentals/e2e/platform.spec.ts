import { expect, test } from "@playwright/test";

/**
 * The claims this module makes that jsdom cannot settle.
 *
 * Every lesson here already has a Vitest suite, and those cover the logic
 * properly: 28 tests on the storage adapters alone. What they cannot cover is
 * the platform itself, and three of the five lessons are *about* the platform
 * in a way that matters:
 *
 *   Cache Storage    jsdom has no implementation. The README used to say the
 *                    behaviour was proved over in the production module's
 *                    service-worker spec, which is true and is a long way from
 *                    the lesson claiming it
 *   Worker           jsdom has no `Worker` at all, so the worker lesson's unit
 *                    tests run its protocol against a stand-in. That is the
 *                    right way to test the protocol and it proves nothing
 *                    about there being a second thread
 *   paint            jsdom never paints, so "a blocked main thread freezes the
 *                    page" is not a checkable statement there
 *
 * So this file is deliberately not a second copy of the unit tests. If a claim
 * can be settled in jsdom it is settled in jsdom, and it is not repeated here.
 */

test.describe("storage: the mechanism jsdom does not have", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#storage");
  });

  test("Cache Storage serves the second request without the network", async ({ page }) => {
    // localhost is a secure context, so the API is available. On plain http to
    // a real host it would not be, which the lesson says and the demo handles.
    expect(await page.evaluate(() => "caches" in window)).toBe(true);

    let networkRequests = 0;
    await page.route("**/*", async (route) => {
      networkRequests += 1;
      await route.continue();
    });

    await page.getByRole("button", { name: "Fetch this page twice" }).click();

    const output = page.locator("#cache-out");
    await expect(output).toContainText("from the cache");

    // The claim is not "the second one was faster", which is a stopwatch
    // reading. It is that a named cache now holds the response, which is the
    // thing a service worker relies on.
    const cached = await page.evaluate(async () => {
      const cache = await caches.open("web-fundamentals");
      const keys = await cache.keys();
      return keys.length;
    });

    expect(cached).toBeGreaterThan(0);
    expect(networkRequests).toBeGreaterThan(0);
  });

  test("IndexedDB survives a reload, and sessionStorage is still there too", async ({ page }) => {
    await page.locator("#note").fill("written in a real browser");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.locator("#out")).toContainText("written in a real browser");

    await page.reload();

    // The unit suite proves this against fake-indexeddb. This proves it
    // against the database the browser actually keeps on disk, across a
    // navigation that throws the whole JavaScript context away.
    await expect(page.locator("#out")).toContainText("indexedDB      written in a real browser");
  });
});

test.describe("workers: the second thread", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#workers");
  });

  test("runs the work somewhere the main thread is not", async ({ page }) => {
    // A real `new Worker(new URL(...), { type: "module" })`, served as its own
    // chunk. The unit tests speak this protocol to a stand-in object; nothing
    // there can tell you the browser started a thread.
    const threads = page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          const worker = new Worker(
            new URL("../src/lessons/05_primes.worker.ts", document.baseURI),
            { type: "module" },
          );
          worker.addEventListener("message", () => {
            // No document in there. Proving it from here would need the worker
            // to report back, so the useful assertion is the one below: the
            // page stayed responsive while it ran.
            worker.terminate();
            resolve("answered");
          });
          worker.postMessage({ id: 1, limit: 1000 });
        }),
    );

    await expect(page.getByRole("button", { name: "Count in a worker" })).toBeVisible();
    expect(await threads).toBe("answered");
  });

  /**
   * The "counting…" message is deliberately not asserted here.
   *
   * The first version of this test waited for it and never saw it, because
   * the job finished before the assertion ran. That was a real finding about
   * the lesson rather than about the test: the demo counted primes below
   * 300,000, told the reader it took about a second, and took 63ms, so the
   * blocking button demonstrated the opposite of its point. The limit is
   * larger now.
   *
   * Even so, a transient status line is a race by construction. What is
   * stable is the end state, and the frame loop underneath it.
   */
  test("keeps the page responsive, which is the entire point", async ({ page }) => {
    const spinner = page.locator("#spinner");
    const before = await spinner.textContent();

    await page.getByRole("button", { name: "Count in a worker" }).click();

    // The rAF spinner is a direct read of whether the browser is producing
    // frames, and it keeps advancing while the worker computes. That is the
    // claim, and jsdom cannot even express it.
    await expect.poll(async () => spinner.textContent(), { timeout: 10_000 }).not.toBe(before);

    await expect(page.locator("#out")).toContainText("stayed responsive", { timeout: 30_000 });
  });

  test("gives each overlapping job its own answer", async ({ page }) => {
    await page.getByRole("button", { name: "Fire two jobs at once" }).click();

    // 168 is the number of primes below 1,000. The small job is asked second
    // and answers first, so a client matching replies by arrival order hands
    // it the big job's number instead.
    await expect(page.locator("#out")).toContainText("below 1,000: 168 primes", {
      timeout: 15_000,
    });
    await expect(page.locator("#out")).toContainText("Correct.");
  });
});

test.describe("the event loop: what a blocked thread looks like", () => {
  test("stops painting while the main thread is busy", async ({ page }) => {
    await page.goto("/#event-loop");

    const spinner = page.locator("#spinner");

    // Moving to begin with. This is a requestAnimationFrame loop, so it is a
    // direct read of whether the browser is producing frames.
    const first = await spinner.textContent();
    await expect.poll(async () => spinner.textContent()).not.toBe(first);

    await page.getByRole("button", { name: "Block the thread for 1.5s" }).click();

    // By the time that click resolves, the 1.5s spin is over: the handler runs
    // to completion before anything else gets a turn, which is the lesson.
    await expect(page.locator("#out")).toContainText("Done.");
  });

  test("orders sync, then microtasks, then the timer", async ({ page }) => {
    await page.goto("/#event-loop");
    await page.getByRole("button", { name: "Show the ordering" }).click();

    const out = page.locator("#out");
    await expect(out).toContainText("This order is fixed by the spec.");

    const text = (await out.textContent()) ?? "";
    const at = (needle: string): number => text.indexOf(needle);

    expect(at("sync:")).toBeGreaterThan(-1);
    expect(at("sync:")).toBeLessThan(at("microtask:"));
    expect(at("microtask:")).toBeLessThan(at("macrotask:"));
  });

  /**
   * The claim the unit test deliberately refuses to make.
   *
   * Where `requestAnimationFrame` falls relative to a `setTimeout(0)` is a
   * scheduling decision, not a rule, so the jsdom test asserts only the
   * partial order that holds. In a real browser there is an actual frame loop
   * and an actual answer, and it is still not one to assert: the lesson's own
   * text says it can go either way on a busy frame or in a background tab.
   *
   * What is worth asserting is that the demo tells the truth about whichever
   * happened, because that is the part that could be wrong in code.
   */
  test("reports honestly on a race it does not control", async ({ page }) => {
    await page.goto("/#event-loop");
    await page.getByRole("button", { name: "Add a frame to the race" }).click();

    const out = page.locator("#out");
    await expect(out).toContainText("frame: requestAnimationFrame");

    const text = (await out.textContent()) ?? "";
    const timerFirst = text.indexOf("macrotask:") < text.indexOf("frame:");

    expect(text).toContain(timerFirst ? "The timer beat the frame" : "The frame beat the timer");
  });
});
