import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  HASHED_ASSET,
  checkManifest,
  registerServiceWorker,
  staleCacheNames,
  strategyFor,
} from "../lib/offline";
import { Offline } from "./08_offline";

const publicDir = join(import.meta.dirname, "..", "..", "public");
const swSource = readFileSync(join(publicDir, "sw.js"), "utf8");
const manifestSource = readFileSync(join(publicDir, "manifest.webmanifest"), "utf8");

const ORIGIN = "http://localhost:5182";

describe("which strategy a request gets", () => {
  it("caches a hashed asset forever, because it cannot go stale", () => {
    // The content hash is in the filename. Different bytes, different name.
    expect(strategyFor({ url: "/assets/index-B2HYv2F6.js" }, ORIGIN)).toBe("cache-first");
    expect(strategyFor({ url: "/assets/index-CfFrHwYC.css" }, ORIGIN)).toBe("cache-first");
    expect(strategyFor({ url: "/assets/Inter-a1b2c3d4.woff2" }, ORIGIN)).toBe("cache-first");
  });

  it("goes to the network first for a page load", () => {
    // Serving a cached index.html pins people to a deploy whose asset URLs
    // may already be deleted. That is the white screen that clears up on its
    // own over several hours and cannot be reproduced.
    expect(strategyFor({ url: "/", mode: "navigate" }, ORIGIN)).toBe("network-first");
    expect(strategyFor({ url: "/deep/link", mode: "navigate" }, ORIGIN)).toBe("network-first");
  });

  it("never caches an API response", () => {
    // The single most common service worker bug, and it arrives as a report
    // about data that will not update.
    expect(strategyFor({ url: "/api/flags" }, ORIGIN)).toBe("network-only");
    expect(strategyFor({ url: "/api/" }, ORIGIN)).toBe("network-only");
  });

  it("leaves another origin's caching to that origin", () => {
    expect(strategyFor({ url: "https://cdn.example.com/lib.js" }, ORIGIN)).toBe("network-only");
  });

  it("does not cache an unhashed file that merely looks like an asset", () => {
    // /logo.svg has no hash, so a cached copy is stale the moment it changes.
    expect(strategyFor({ url: "/logo.svg" }, ORIGIN)).toBe("network-only");
    expect(strategyFor({ url: "/assets/logo.svg" }, ORIGIN)).toBe("network-only");
    // Too short to be a content hash.
    expect(strategyFor({ url: "/assets/index-ab12.js" }, ORIGIN)).toBe("network-only");
  });

  it("never caches a write", () => {
    // cache.put throws on a non-GET, and a cached POST is meaningless anyway.
    expect(strategyFor({ url: "/api/x", method: "POST" }, ORIGIN)).toBe("network-only");
    expect(strategyFor({ url: "/", mode: "navigate", method: "POST" }, ORIGIN)).toBe(
      "network-only",
    );
  });

  it("falls back to network-only on a URL it cannot parse", () => {
    expect(strategyFor({ url: "http://[" }, ORIGIN)).toBe("network-only");
  });
});

describe("the worker mirrors the module", () => {
  /**
   * `public/sw.js` runs in a worker scope with no module system worth relying
   * on, so it carries its own copy of the strategy rule. Mirrored code drifts,
   * so the test pins the two together: the worker has to contain the same
   * regex and the same branches.
   */
  it("uses the same hashed-asset pattern", () => {
    // Compared as source text, not by writing the regex out twice here. The
    // first attempt did the latter and spent its time escaping backslashes
    // rather than checking anything.
    expect(swSource).toContain(HASHED_ASSET.source);
  });

  it("has all three strategies and the non-GET guard", () => {
    expect(swSource).toContain('"network-first"');
    expect(swSource).toContain('"cache-first"');
    expect(swSource).toContain('"network-only"');
    expect(swSource).toMatch(/method !== "GET"/);
  });

  it("deletes stale caches on activate", () => {
    // Without this every deploy leaves another copy of the app on disk.
    expect(swSource).toMatch(/addEventListener\("activate"/);
    expect(swSource).toMatch(/caches\.delete/);
  });

  it("clones a response before caching it", () => {
    // A Response body is a stream and reads once. Cache the original and the
    // page gets an empty one.
    expect(swSource).toMatch(/response\.clone\(\)/);
  });
});

describe("deleting the caches a previous version left", () => {
  it("keeps this version's and drops the rest", () => {
    expect(staleCacheNames(["shell-v1", "assets-v1", "shell-v0", "assets-v0"], "v1")).toEqual([
      "shell-v0",
      "assets-v0",
    ]);
  });

  it("drops everything when the version moves on", () => {
    expect(staleCacheNames(["shell-v1", "assets-v1"], "v2")).toEqual(["shell-v1", "assets-v1"]);
  });

  it("copes with no caches at all", () => {
    expect(staleCacheNames([], "v1")).toEqual([]);
  });
});

describe("the manifest", () => {
  it("accepts the one this module ships", () => {
    // Asserted against the real file, so editing it without reading this
    // fails here rather than in a browser that quietly never offers to
    // install the app.
    const manifest = JSON.parse(manifestSource) as Record<string, unknown>;
    expect(checkManifest(manifest)).toEqual({ ok: true, problems: [] });
  });

  it("requires a display mode a browser will install", () => {
    expect(
      checkManifest({ name: "x", short_name: "x", start_url: "/", icons: [{}] }).problems,
    ).toContain("display must be standalone, fullscreen or minimal-ui to be installable");
  });

  it("wants a maskable icon, or Android crops the square one", () => {
    const problems = checkManifest({
      name: "x",
      short_name: "x",
      start_url: "/",
      display: "standalone",
      icons: [{ src: "/i.png", purpose: "any" }],
    }).problems;

    expect(problems).toEqual(["no maskable icon: Android will crop the square one"]);
  });

  it("accepts a purpose listing several values", () => {
    // The field is a space-separated list, so "any maskable" is one icon
    // serving both. Splitting on it is the part a naive equality check gets
    // wrong.
    expect(
      checkManifest({
        name: "x",
        short_name: "x",
        start_url: "/",
        display: "standalone",
        icons: [{ src: "/i.svg", purpose: "any maskable" }],
      }).ok,
    ).toBe(true);
  });

  it("names every missing field at once", () => {
    expect(checkManifest({}).problems.length).toBeGreaterThan(3);
  });
});

describe("registration", () => {
  it("refuses outside a secure context rather than throwing", () => {
    // localhost counts as secure, which is why this works in development and
    // then does not on a staging box served over plain http.
    const scope = {
      isSecureContext: false,
      navigator: { serviceWorker: {} } as unknown as Navigator,
    };

    return expect(registerServiceWorker("/sw.js", scope)).resolves.toEqual({
      ok: false,
      reason: "insecure",
    });
  });

  it("reports an unsupported browser", async () => {
    const scope = { isSecureContext: true, navigator: {} as Navigator };
    await expect(registerServiceWorker("/sw.js", scope)).resolves.toEqual({
      ok: false,
      reason: "unsupported",
    });
  });

  it("turns a failed registration into a value rather than a rejection", async () => {
    // A 404 on the worker, a syntax error inside it, or a MIME type the
    // browser refuses. All three are silent unless something reports them.
    const scope = {
      isSecureContext: true,
      navigator: {
        serviceWorker: { register: vi.fn(() => Promise.reject(new Error("404"))) },
      } as unknown as Navigator,
    };

    const outcome = await registerServiceWorker("/sw.js", scope);
    expect(outcome.ok).toBe(false);
    expect(outcome).toMatchObject({ reason: "failed" });
  });

  it("reports the scope on success", async () => {
    const scope = {
      isSecureContext: true,
      navigator: {
        serviceWorker: { register: vi.fn(() => Promise.resolve({ scope: "http://localhost/" })) },
      } as unknown as Navigator,
    };

    await expect(registerServiceWorker("/sw.js", scope)).resolves.toEqual({
      ok: true,
      scope: "http://localhost/",
    });
  });
});

describe("the component", () => {
  it("shows the strategy for each example request", () => {
    render(<Offline />);

    expect(screen.getByTestId("strategy-/")).toHaveTextContent("network-first");
    expect(screen.getByTestId("strategy-/assets/index-B2HYv2F6.js")).toHaveTextContent(
      "cache-first",
    );
    expect(screen.getByTestId("strategy-/api/flags")).toHaveTextContent("network-only");
  });

  it("says the worker is not registered until it is", () => {
    render(<Offline />);
    expect(screen.getByTestId("registration")).toHaveTextContent("—");
  });

  it("reports why registration failed instead of failing silently", async () => {
    // jsdom has no serviceWorker on navigator, which is exactly the
    // "unsupported" branch a user on an old browser hits.
    const user = userEvent.setup();
    render(<Offline />);

    await user.click(screen.getByTestId("register"));

    expect(await screen.findByText(/not registered/)).toBeInTheDocument();
  });
});
