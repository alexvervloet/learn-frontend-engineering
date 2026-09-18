import { beforeEach, describe, expect, it, vi } from "vitest";

import { readJson, writeJson } from "./04_storage";

describe("safe storage reads", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
