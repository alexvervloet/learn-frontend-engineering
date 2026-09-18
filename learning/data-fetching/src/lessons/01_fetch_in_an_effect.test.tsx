import { screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { server } from "../api/server";
import { renderWithClient } from "../test-utils";
import { FetchInAnEffect } from "./01_fetch_in_an_effect";

/**
 * MSW emits an event per intercepted request, which is how these tests count
 * network calls without instrumenting the components. Counting requests is the
 * only honest way to test a cache: everything else only proves the right data
 * ended up on screen, which both panels manage.
 */
let requests: string[] = [];

function record({ request }: { request: Request }) {
  requests.push(new URL(request.url).search || "(no query)");
}

beforeEach(() => {
  requests = [];
  server.events.on("request:start", record);
});

afterEach(() => {
  server.events.removeListener("request:start", record);
});

async function clickTag(name: string) {
  await userEvent.click(screen.getByRole("button", { name }));
}

describe("a cache, versus no cache", () => {
  it("fetches once per visit without one, and once per tag with one", async () => {
    renderWithClient(<FetchInAnEffect />);
    await waitForElementToBeRemoved(() => screen.queryAllByText("loading…"), { timeout: 3000 });

    // react (both panels) → testing (both) → react again.
    await clickTag("testing");
    await screen.findByText("MSW docs", {}, { timeout: 3000 });
    await clickTag("react");
    await screen.findByText("Rules of React", {}, { timeout: 3000 });

    // Two panels, three visits. Six requests if nothing is cached, five if the
    // second visit to "react" is served from memory.
    expect(requests).toHaveLength(5);
  });

  it("still gets the right rows on both sides, which is why the difference is easy to miss", async () => {
    renderWithClient(<FetchInAnEffect />);
    await waitForElementToBeRemoved(() => screen.queryAllByText("loading…"), { timeout: 3000 });

    expect(screen.getByTestId("hand-rolled")).toHaveTextContent("Rules of React");
    expect(screen.getByTestId("with-query")).toHaveTextContent("Rules of React");
  });

  it("shows the cached rows immediately on a second visit, with no loading state", async () => {
    renderWithClient(<FetchInAnEffect />);
    await waitForElementToBeRemoved(() => screen.queryAllByText("loading…"), { timeout: 3000 });

    await clickTag("testing");
    await screen.findByText("MSW docs", {}, { timeout: 3000 });
    await clickTag("react");

    // The hand-rolled panel is back at "loading…". The cached one is not.
    expect(screen.getByTestId("hand-rolled-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("with-query-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("with-query")).toHaveTextContent("Rules of React");
  });
});
