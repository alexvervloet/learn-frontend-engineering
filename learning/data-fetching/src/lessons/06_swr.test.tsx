import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { server } from "../api/server";
import { renderWithClient } from "../test-utils";
import { SwrLesson, keysToRevalidate } from "./06_swr";

let requests: string[] = [];

function record({ request }: { request: Request }) {
  requests.push(new URL(request.url).pathname + new URL(request.url).search);
}

beforeEach(() => {
  requests = [];
  server.events.on("request:start", record);
});

afterEach(() => {
  server.events.removeListener("request:start", record);
});

describe("SWR deduplicates by key", () => {
  it("serves two components from one request", async () => {
    // The claim the whole category rests on, and the reason a cache keyed by
    // the request is better than a cache keyed by the component. Both panels
    // ask for the same key on the same render pass.
    renderWithClient(<SwrLesson />);

    // Scoped to one panel: all three render the same rows, so a bare
    // findByText matches several and throws.
    await waitFor(() => expect(screen.getByTestId("swr-a")).toHaveTextContent("Rules of React"), {
      timeout: 3000,
    });

    const bookmarkRequests = requests.filter((url) => url.startsWith("/api/bookmarks"));
    // One for the two SWR panels, one for the Query panel beside them.
    expect(bookmarkRequests).toHaveLength(2);
  });

  it("shows the same rows in both panels", async () => {
    renderWithClient(<SwrLesson />);

    await waitFor(
      () => {
        expect(screen.getByTestId("swr-a")).toHaveTextContent("Rules of React");
        expect(screen.getByTestId("swr-b")).toHaveTextContent("Rules of React");
      },
      { timeout: 3000 },
    );
  });

  it("settles out of the revalidating state", async () => {
    // isValidating is the flag that lets you say "updating" without covering
    // content the user is already reading with a spinner.
    renderWithClient(<SwrLesson />);

    await waitFor(
      () => {
        expect(screen.getByTestId("swr-a-validating")).toHaveTextContent("idle");
      },
      { timeout: 3000 },
    );
  });

  it("refetches when mutate matches the key", async () => {
    const user = userEvent.setup();
    renderWithClient(<SwrLesson />);

    await waitFor(() => expect(screen.getByTestId("swr-a")).toHaveTextContent("Rules of React"), {
      timeout: 3000,
    });
    const before = requests.filter((url) => url.startsWith("/api/bookmarks")).length;

    await user.click(screen.getByTestId("revalidate"));

    await waitFor(
      () => {
        const after = requests.filter((url) => url.startsWith("/api/bookmarks")).length;
        expect(after).toBeGreaterThan(before);
      },
      { timeout: 3000 },
    );
  });
});

describe("what a string key costs", () => {
  /**
   * TanStack Query invalidates `["bookmarks", { tag }]` by prefix, because the
   * key is structured and the library understands it. SWR's keys are strings,
   * so "everything under bookmarks" is a predicate you write.
   *
   * It works. The point of testing it is that it is now your code, with your
   * bug in it, rather than the library's.
   */
  it("matches every key under a prefix", () => {
    const keys = ["/api/bookmarks", "/api/bookmarks?tag=react", "/api/tags"];

    expect(keysToRevalidate(keys, "/api/bookmarks")).toEqual([
      "/api/bookmarks",
      "/api/bookmarks?tag=react",
    ]);
  });

  it("does not match a key that merely contains the prefix", () => {
    // The bug a `.includes` would have. Worth one line to pin down, because
    // over-invalidating is silent: everything just refetches more than it
    // should and the app still works.
    expect(keysToRevalidate(["/api/other/api/bookmarks"], "/api/bookmarks")).toEqual([]);
  });

  it("returns nothing rather than everything for a prefix nobody uses", () => {
    expect(keysToRevalidate(["/api/bookmarks"], "/api/users")).toEqual([]);
  });
});
