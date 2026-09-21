// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createIsrStore } from "./ssg";

function fixedClock(start = 1_000_000) {
  let current = start;
  return {
    now: () => current,
    advanceSeconds: (seconds: number) => {
      current += seconds * 1000;
    },
  };
}

describe("incremental regeneration", () => {
  it("builds on the first request and only then", async () => {
    const clock = fixedClock();
    const store = createIsrStore({ revalidate: 60, now: clock.now });
    const render = vi.fn(async () => "<p>built</p>");

    expect(await store.serve("/products", render)).toEqual({
      html: "<p>built</p>",
      status: "miss",
    });
    expect(await store.serve("/products", render)).toEqual({ html: "<p>built</p>", status: "hit" });

    // One render for two requests. A thousand requests inside the window is
    // still one render.
    expect(render).toHaveBeenCalledOnce();
  });

  it("serves the stale copy rather than making anyone wait", async () => {
    const clock = fixedClock();
    const store = createIsrStore({ revalidate: 60, now: clock.now });
    let version = 1;
    const render = async () => `<p>version ${version}</p>`;

    await store.serve("/products", render);
    clock.advanceSeconds(61);
    version = 2;

    const served = await store.serve("/products", render);

    // Deliberately old. Nobody waited, and the next visitor gets version 2.
    expect(served).toEqual({ html: "<p>version 1</p>", status: "stale" });
  });

  it("gives the next visitor the rebuilt page", async () => {
    const clock = fixedClock();
    const store = createIsrStore({ revalidate: 60, now: clock.now });
    let version = 1;
    const render = async () => `<p>version ${version}</p>`;

    await store.serve("/products", render);
    clock.advanceSeconds(61);
    version = 2;
    await store.serve("/products", render);

    // Let the background rebuild finish.
    await vi.waitFor(() => expect(store.buildCount()).toBe(2));

    expect(await store.serve("/products", render)).toEqual({
      html: "<p>version 2</p>",
      status: "hit",
    });
  });

  it("does not start a rebuild per request under a burst", async () => {
    const clock = fixedClock();
    const store = createIsrStore({ revalidate: 60, now: clock.now });
    const render = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "<p>rebuilt</p>";
    });

    await store.serve("/products", render);
    clock.advanceSeconds(61);

    // Ten simultaneous requests the instant it expires.
    await Promise.all(Array.from({ length: 10 }, () => store.serve("/products", render)));
    await vi.waitFor(() => expect(store.buildCount()).toBe(2));

    // The first build, plus one rebuild. Without the pending guard this is
    // eleven, which is the cache stampede.
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("rebuilds on the next request after an on-demand invalidation", async () => {
    const clock = fixedClock();
    const store = createIsrStore({ revalidate: 3600, now: clock.now });
    let version = 1;
    const render = async () => `<p>version ${version}</p>`;

    await store.serve("/products", render);
    version = 2;

    // An editor pressed publish. Waiting an hour is not an answer.
    store.invalidate("/products");

    expect(await store.serve("/products", render)).toEqual({
      html: "<p>version 2</p>",
      status: "miss",
    });
  });
});

describe("when a background rebuild fails", () => {
  /**
   * The visitor is never the one who finds out. They were answered from the
   * stored copy before the rebuild started, and so is everyone after them.
   *
   * What must not happen is the process exiting. `void build(...)` with no
   * catch is an unhandled rejection, and Node's default for one of those is
   * to terminate, so a CMS being down for a minute takes the site with it.
   */
  it("keeps serving the stored copy and reports the failure", async () => {
    let clock = 0;
    const errors: unknown[] = [];
    const store = createIsrStore({
      revalidate: 10,
      now: () => clock,
      onError: (error) => errors.push(error),
    });

    let renders = 0;
    const render = async (): Promise<string> => {
      renders += 1;
      if (renders > 1) throw new Error("the CMS is down");
      return "<p>v1</p>";
    };

    expect(await store.serve("/p", render)).toEqual({ html: "<p>v1</p>", status: "miss" });

    clock += 20_000;
    expect(await store.serve("/p", render)).toEqual({ html: "<p>v1</p>", status: "stale" });

    // Let the rejected rebuild settle. Without the catch this is where the
    // process would go.
    await vi.waitFor(() => expect(store.failureCount()).toBe(1));

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
    expect(store.buildCount()).toBe(1);
  });

  it("lets the next request try again", async () => {
    let clock = 0;
    const store = createIsrStore({ revalidate: 10, now: () => clock, onError: () => {} });

    let renders = 0;
    const render = async (): Promise<string> => {
      renders += 1;
      if (renders === 2) throw new Error("transient");
      return `<p>v${String(renders)}</p>`;
    };

    await store.serve("/p", render);

    clock += 20_000;
    await store.serve("/p", render);
    // The failed rebuild has to clear `pending`, or the page is stuck stale
    // for as long as the process lives.
    await vi.waitFor(() => expect(store.failureCount()).toBe(1));

    clock += 20_000;
    await store.serve("/p", render);
    await vi.waitFor(() => expect(store.buildCount()).toBe(2));

    clock += 1_000;
    expect(await store.serve("/p", render)).toEqual({ html: "<p>v3</p>", status: "hit" });
  });
});
