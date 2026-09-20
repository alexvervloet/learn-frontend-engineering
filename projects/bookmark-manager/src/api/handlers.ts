import { HttpResponse, delay, http } from "msw";

import { db } from "./db";
import { PAGE_SIZE } from "./types";

/**
 * The same routes the Express app in Practice-Backends serves, so the client
 * code does not know which one it is talking to.
 *
 * Written once and used in three places: the Service Worker in development,
 * the Node interceptor in tests, and nothing in production, where the real
 * API answers.
 */
const LATENCY_MS = 120;

/** The API is behind a bearer token, exactly as the real one is. */
function unauthorised(request: Request): Response | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ") === true) return null;

  return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 });
}

export const handlers = [
  http.post("/api/auth/token", async ({ request }) => {
    await delay(LATENCY_MS);
    const body = (await request.json()) as { username?: string; password?: string };

    // One valid credential pair, so the login form has a failure path.
    if (body.username !== "ada" || body.password !== "correct-horse") {
      return HttpResponse.json({ detail: "Incorrect username or password" }, { status: 401 });
    }

    return HttpResponse.json({ access_token: "demo-access-token", token_type: "bearer" });
  }),

  http.get("/api/auth/me", async ({ request }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;

    return HttpResponse.json(db.user());
  }),

  http.get("/api/tags", async ({ request }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;

    return HttpResponse.json(db.tags());
  }),

  http.get("/api/bookmarks", async ({ request }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;

    const url = new URL(request.url);
    const tag = url.searchParams.get("tag");
    const favoriteParam = url.searchParams.get("favorite");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? String(PAGE_SIZE));

    const matching = db.filter({
      tag,
      favorite: favoriteParam === null ? null : favoriteParam === "true",
    });

    // The real API returns a bare array and no total, so the client works out
    // "is there a next page" from whether it got a full one. Matching that is
    // the point: a mock that is more helpful than the server teaches you to
    // write a client that will not work.
    return HttpResponse.json(matching.slice(offset, offset + limit));
  }),

  http.get("/api/bookmarks/:id", async ({ request, params }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;

    const bookmark = db.find(Number(params["id"]));
    if (bookmark === undefined) {
      return HttpResponse.json({ detail: "Bookmark not found" }, { status: 404 });
    }

    return HttpResponse.json(bookmark);
  }),

  http.post("/api/bookmarks", async ({ request }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;
    if (db.takeFailure()) {
      return HttpResponse.json({ detail: "The server refused it" }, { status: 500 });
    }

    const body = (await request.json()) as {
      url?: string;
      title?: string;
      description?: string | null;
      tags?: string[];
    };

    // The server validates too. The client's schema is a courtesy to the
    // person typing, not the check.
    if (typeof body.title !== "string" || body.title.trim().length < 2) {
      return HttpResponse.json({ detail: "Title must be at least 2 characters" }, { status: 422 });
    }
    if (typeof body.url !== "string" || !/^https?:\/\//.test(body.url)) {
      return HttpResponse.json({ detail: "URL must be absolute" }, { status: 422 });
    }

    const created = db.create({
      url: body.url,
      title: body.title.trim(),
      description: body.description ?? null,
      tags: body.tags ?? [],
    });

    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch("/api/bookmarks/:id", async ({ request, params }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;
    if (db.takeFailure()) {
      return HttpResponse.json({ detail: "The server refused it" }, { status: 500 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updated = db.update(Number(params["id"]), body);
    if (updated === undefined) {
      return HttpResponse.json({ detail: "Bookmark not found" }, { status: 404 });
    }

    return HttpResponse.json(updated);
  }),

  http.delete("/api/bookmarks/:id", async ({ request, params }) => {
    await delay(LATENCY_MS);
    const denied = unauthorised(request);
    if (denied !== null) return denied;
    if (db.takeFailure()) {
      return HttpResponse.json({ detail: "The server refused it" }, { status: 500 });
    }

    if (!db.remove(Number(params["id"]))) {
      return HttpResponse.json({ detail: "Bookmark not found" }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
