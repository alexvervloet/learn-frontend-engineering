// fake-indexeddb/auto installs a real IndexedDB implementation on globalThis.
// jsdom has none, and a lesson that claims to cover five storage mechanisms
// should not be testing four of them and describing the fifth.
import "fake-indexeddb/auto";

import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  MECHANISMS,
  cacheFirst,
  cookieAssignment,
  deleteCookie,
  hasCacheStorage,
  mechanism,
  openKeyValueStore,
  parseCookies,
  readCookie,
  readJson,
  writeCookie,
  writeJson,
} from "./04_storage";

describe("the comparison table", () => {
  it("has an entry for each of the five mechanisms", () => {
    expect(MECHANISMS.map((entry) => entry.name)).toEqual([
      "cookie",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "cacheStorage",
    ]);
  });

  it("agrees with the claim the module is built on", () => {
    // The cookie is the only one the browser attaches to requests, which is
    // the whole reason sessions live there and the whole reason CSRF exists.
    expect(MECHANISMS.filter((entry) => entry.sentWithRequests).map((entry) => entry.name)).toEqual(
      ["cookie"],
    );

    // The two synchronous ones are the two that block the main thread.
    expect(MECHANISMS.filter((entry) => entry.synchronous).map((entry) => entry.name)).toEqual([
      "cookie",
      "localStorage",
      "sessionStorage",
    ]);

    // Everything reachable from JavaScript is reachable by injected
    // JavaScript. That is the sentence the "never use localStorage" advice
    // leaves off.
    expect(MECHANISMS.every((entry) => entry.readableByScript)).toBe(true);
  });

  it("throws on a name it does not have rather than returning undefined", () => {
    expect(mechanism("indexedDB").storesNonStrings).toBe(true);
    // @ts-expect-error not one of the five
    expect(() => mechanism("webSQL")).toThrow(/unknown mechanism/);
  });
});

describe("safe storage reads", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("round-trips a value", () => {
    writeJson(localStorage, "k", { a: 1 });
    expect(readJson<{ a: number }>(localStorage, "k")).toEqual({ ok: true, value: { a: 1 } });
  });

  it("reports a missing key instead of returning undefined", () => {
    expect(readJson(localStorage, "nope")).toEqual({ ok: false, reason: "missing" });
  });

  it("survives a value that is not JSON", () => {
    // The shape someone else's code left behind, or a half-written value.
    localStorage.setItem("k", "{not json");
    expect(readJson(localStorage, "k")).toEqual({ ok: false, reason: "corrupt JSON" });
  });

  it("survives storage being unavailable entirely", () => {
    // Safari private mode throws on access rather than returning null.
    const throwing = {
      getItem: vi.fn(() => {
        throw new DOMException("denied", "SecurityError");
      }),
    } as unknown as Storage;

    const result = readJson(throwing, "k");
    expect(result.ok).toBe(false);
  });

  it("reports a quota failure rather than throwing", () => {
    const full = {
      setItem: vi.fn(() => {
        throw new DOMException("quota", "QuotaExceededError");
      }),
    } as unknown as Storage;

    expect(writeJson(full, "k", { a: 1 }).ok).toBe(false);
  });

  it("keeps localStorage and sessionStorage apart", () => {
    // One API, two lifetimes. The functions take a Storage precisely so the
    // same code serves both, and mixing them up is a real bug: a preference
    // written to sessionStorage is gone when the tab closes.
    writeJson(sessionStorage, "k", "tab only");

    expect(readJson<string>(sessionStorage, "k")).toEqual({ ok: true, value: "tab only" });
    expect(readJson(localStorage, "k")).toEqual({ ok: false, reason: "missing" });
  });
});

describe("cookies", () => {
  beforeEach(() => {
    for (const name of Object.keys(parseCookies(document.cookie))) deleteCookie(name);
  });

  it("parses the one string the browser gives you", () => {
    expect(parseCookies("theme=dark; session=abc123")).toEqual({
      theme: "dark",
      session: "abc123",
    });
  });

  it("splits on the first equals only", () => {
    // Base64 ends in "=" more often than not, and splitting on every one
    // truncates the value without telling you.
    expect(parseCookies("token=YWJj==")).toEqual({ token: "YWJj==" });
  });

  it("decodes the value", () => {
    expect(parseCookies("greeting=hello%20world")).toEqual({ greeting: "hello world" });
  });

  it("survives a value that is not valid percent-encoding", () => {
    // A stray "%" from something that did not encode its own value.
    expect(parseCookies("discount=50%")).toEqual({ discount: "50%" });
  });

  it("ignores the empty segments a trailing semicolon leaves", () => {
    expect(parseCookies("a=1;;b=2;")).toEqual({ a: "1", b: "2" });
  });

  it("returns an empty jar for an empty header", () => {
    expect(parseCookies("")).toEqual({});
  });

  it("writes and reads one back through document.cookie", () => {
    writeCookie("theme", "dark");
    expect(readCookie("theme")).toBe("dark");
    expect(readCookie("nothing")).toBeNull();
  });

  it("sets one cookie rather than replacing the jar", () => {
    // The assignment API reads like `document.cookie = x` overwrites
    // everything. It does not, and nothing about the syntax tells you.
    writeCookie("a", "1");
    writeCookie("b", "2");

    expect(readCookie("a")).toBe("1");
    expect(readCookie("b")).toBe("2");
  });

  it("deletes by expiring, because there is no delete", () => {
    writeCookie("temp", "x");
    deleteCookie("temp");
    expect(readCookie("temp")).toBeNull();
  });

  it("builds the attributes a session cookie needs", () => {
    expect(cookieAssignment("session", "abc", { maxAgeSeconds: 3600, sameSite: "Strict" })).toBe(
      "session=abc; Path=/; SameSite=Strict; Max-Age=3600",
    );
  });

  it("cannot write HttpOnly, by definition", () => {
    // Worth asserting rather than asserting in prose: a cookie written by a
    // script could be read by that script, so HttpOnly from here would be a
    // lie. It is a Set-Cookie attribute and only a server can send one.
    expect(cookieAssignment("session", "abc")).not.toMatch(/HttpOnly/i);
    expect(cookieAssignment("session", "abc")).not.toMatch(/Secure/i);
  });
});

describe("IndexedDB", () => {
  beforeEach(() => {
    // A fresh factory per test. The alternative is deleting databases
    // between tests and waiting on the blocked event, which is its own
    // lesson and not this one.
    globalThis.indexedDB = new IDBFactory();
  });

  it("round-trips a value", async () => {
    const store = await openKeyValueStore();
    await store.set("note", "hello");

    expect(await store.get<string>("note")).toBe("hello");
    store.close();
  });

  it("returns undefined for a key it does not have", async () => {
    const store = await openKeyValueStore();
    expect(await store.get("nope")).toBeUndefined();
    store.close();
  });

  it("stores things JSON cannot", async () => {
    // The practical difference from localStorage, and the reason to reach
    // for it. Structured clone keeps the type; JSON.stringify turns a Date
    // into a string and never turns it back.
    const store = await openKeyValueStore();
    const when = new Date("2026-01-01T00:00:00.000Z");

    await store.set("when", when);
    await store.set("bytes", new Uint8Array([1, 2, 3]));

    expect((await store.get<Date>("when"))?.toISOString()).toBe("2026-01-01T00:00:00.000Z");

    // Compared as numbers, not with toEqual against a fresh Uint8Array.
    // fake-indexeddb clones through Node's realm and jsdom's globals are a
    // different one, so the two typed arrays hold the same bytes and fail an
    // identity-sensitive comparison. That is an artefact of testing in two
    // realms rather than anything a browser does, and asserting the bytes
    // says what the lesson means anyway.
    const bytes = await store.get<Uint8Array>("bytes");
    expect(bytes).toBeDefined();
    expect([...(bytes ?? [])]).toEqual([1, 2, 3]);

    store.close();
  });

  it("lists its keys and forgets a removed one", async () => {
    const store = await openKeyValueStore();
    await store.set("a", 1);
    await store.set("b", 2);

    expect((await store.keys()).sort()).toEqual(["a", "b"]);

    await store.remove("a");
    expect(await store.keys()).toEqual(["b"]);

    store.close();
  });

  it("survives being opened twice", async () => {
    // onupgradeneeded only fires once. A second open of an existing database
    // must not try to create the store again, and getting that wrong throws
    // ConstraintError on the second page load rather than the first.
    const first = await openKeyValueStore();
    await first.set("k", "v");
    first.close();

    const second = await openKeyValueStore();
    expect(await second.get<string>("k")).toBe("v");
    second.close();
  });
});

describe("Cache Storage", () => {
  /**
   * The one mechanism this suite cannot exercise.
   *
   * jsdom does not implement Cache Storage, and there is no honest stub:
   * a fake that stores Responses in a Map would prove the test's Map works.
   * So the assertions here are about the feature detection, which is the
   * part that has to be right in a browser that lacks it, and the behaviour
   * is proved against Chromium in the production module's offline lesson.
   */
  it("reports that it is missing rather than throwing on load", () => {
    expect(hasCacheStorage()).toBe(false);
  });

  it("refuses to pretend when it is not there", async () => {
    await expect(cacheFirst("x", "/y")).rejects.toThrow(/not available/);
  });

  it("is detected when the browser has it", () => {
    vi.stubGlobal("caches", {} as CacheStorage);
    expect(hasCacheStorage()).toBe(true);
    vi.unstubAllGlobals();
  });
});
