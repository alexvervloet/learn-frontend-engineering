/**
 * The network, described once.
 *
 * These handlers run in two places without changing: a Service Worker in the
 * browser (`browser.ts`) and an interceptor in Node during tests
 * (`server.ts`). That is the argument for MSW over stubbing `fetch` or mocking
 * the module that calls it. Your code makes a real request, and what you are
 * testing is the code you ship rather than a version of it with a seam cut into
 * it for the test.
 */
import { HttpResponse, delay, http } from "msw";

import { db } from "./db";

/** Slow enough to see a loading state in the browser, fast enough not to bore a test. */
const LATENCY_MS = 300;

export const handlers = [
  http.get("/api/bookmarks", async ({ request }) => {
    await delay(LATENCY_MS);
    const url = new URL(request.url);

    const cursor = url.searchParams.get("cursor");
    if (cursor !== null) {
      const offset = Number(cursor);
      const limit = 3;
      const { items, total } = db.page(offset, limit);
      const next = offset + limit;
      return HttpResponse.json({ items, nextCursor: next < total ? next : null });
    }

    return HttpResponse.json(db.byTag(url.searchParams.get("tag")));
  }),

  http.post("/api/bookmarks", async ({ request }) => {
    await delay(LATENCY_MS);
    if (db.takeFailure()) {
      return HttpResponse.json({ message: "the server refused it" }, { status: 500 });
    }

    const body = (await request.json()) as { title: string; url: string; tag: string };
    if (body.title.trim() === "") {
      return HttpResponse.json({ message: "a title is required" }, { status: 422 });
    }

    return HttpResponse.json(db.add(body.title, body.url, body.tag), { status: 201 });
  }),

  http.post("/api/bookmarks/:id/vote", async ({ params }) => {
    await delay(LATENCY_MS);
    if (db.takeFailure()) {
      return HttpResponse.json({ message: "vote rejected" }, { status: 500 });
    }

    const voted = db.vote(String(params["id"]));
    if (voted === null) return HttpResponse.json({ message: "no such bookmark" }, { status: 404 });
    return HttpResponse.json(voted);
  }),
];
