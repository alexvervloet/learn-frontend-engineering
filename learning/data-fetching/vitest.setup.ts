/**
 * Starts the mock network for this module's tests.
 *
 * `onUnhandledRequest: "error"` is the setting worth arguing for. The default
 * lets a request MSW has no handler for go to the real network, where it either
 * hangs or hits something it should not. Failing loudly means a typo in a URL
 * shows up as "no handler for GET /api/bookmark" instead of a test that is
 * mysteriously slow.
 */
import { afterAll, afterEach, beforeAll } from "vitest";

import { db } from "./src/api/db";
import { server } from "./src/api/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  // Handlers a test added with server.use() are per-test, and the data goes
  // back to the seed, so no test can depend on another having run first.
  server.resetHandlers();
  db.reset();
});

afterAll(() => {
  server.close();
});
