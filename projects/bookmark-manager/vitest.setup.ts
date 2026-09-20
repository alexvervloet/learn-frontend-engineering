/**
 * The mock API, for the whole test suite.
 *
 * `onUnhandledRequest: "error"` because a request with no handler is almost
 * always a typo in a URL, and letting it through produces a test that is
 * mysteriously slow rather than one that fails with a useful message.
 */
import { afterAll, afterEach, beforeAll } from "vitest";

import { db } from "./src/api/db";
import { server } from "./src/api/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  db.reset();
});

afterAll(() => {
  server.close();
});
