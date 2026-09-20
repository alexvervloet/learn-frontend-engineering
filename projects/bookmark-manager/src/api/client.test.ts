import { describe, expect, it } from "vitest";

import { ApiError, listBookmarks, setAccessToken } from "./client";
import { toBookmark } from "./types";

describe("the fetch layer", () => {
  it("throws on a non-2xx, which fetch does not", async () => {
    setAccessToken(null);

    // `fetch` resolves with ok:false for a 401, so code that only catches
    // rejections treats an error page as data.
    await expect(
      listBookmarks({ tag: null, favorite: null, offset: 0, limit: 5 }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("carries the status, so a caller can tell 401 from 500", async () => {
    setAccessToken(null);

    try {
      await listBookmarks({ tag: null, favorite: null, offset: 0, limit: 5 });
      throw new Error("unreachable");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(401);
    }
  });

  it("sends the bearer token once one is set", async () => {
    setAccessToken("test-access-token");

    const rows = await listBookmarks({ tag: null, favorite: null, offset: 0, limit: 5 });

    expect(rows.length).toBeGreaterThan(0);
    setAccessToken(null);
  });

  it("aborts rather than ignoring a superseded request", async () => {
    setAccessToken("test-access-token");
    const controller = new AbortController();

    const pending = listBookmarks({
      tag: null,
      favorite: null,
      offset: 0,
      limit: 5,
      signal: controller.signal,
    });
    controller.abort();

    // An abort is the expected outcome of switching filters, not a failure.
    await expect(pending).rejects.toThrow();
    setAccessToken(null);
  });
});

describe("the wire format", () => {
  it("is converted once, at the boundary", () => {
    const wire = {
      id: 1,
      url: "https://example.com",
      title: "Example",
      description: null,
      favorite: false,
      click_count: 3,
      category_id: null,
      created_at: "2026-01-20T00:00:00.000Z",
      updated_at: "2026-01-20T00:00:00.000Z",
      tags: [{ id: 1, name: "react" }],
    };

    // snake_case stops here. Nothing past src/api knows the server's shape,
    // so a change to it is one file to edit.
    expect(toBookmark(wire)).toEqual({
      id: 1,
      url: "https://example.com",
      title: "Example",
      description: null,
      favorite: false,
      clickCount: 3,
      categoryId: null,
      createdAt: "2026-01-20T00:00:00.000Z",
      updatedAt: "2026-01-20T00:00:00.000Z",
      tags: [{ id: 1, name: "react" }],
    });
  });
});
