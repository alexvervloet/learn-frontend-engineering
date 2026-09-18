import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { server } from "../api/server";
import { renderWithClient } from "../test-utils";
import { KeysAndStaleness } from "./02_keys_and_staleness";

let requests: string[] = [];

function record({ request }: { request: Request }) {
  requests.push(new URL(request.url).search);
}

beforeEach(() => {
  requests = [];
  server.events.on("request:start", record);
});

afterEach(() => {
  server.events.removeListener("request:start", record);
});

describe("query keys", () => {
  it("serves two components from one request when the key matches", async () => {
    renderWithClient(<KeysAndStaleness />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    expect(screen.getByTestId("summary")).toHaveTextContent("2 bookmarks tagged react");
    expect(requests).toEqual(["?tag=react"]);
  });

  it("treats a different key as different data", async () => {
    renderWithClient(<KeysAndStaleness />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "testing" }));
    await screen.findByText(/bookmarks tagged testing/, {}, { timeout: 3000 });

    expect(requests).toEqual(["?tag=react", "?tag=testing"]);
  });

  it("makes no request at all for a revisit inside staleTime", async () => {
    renderWithClient(<KeysAndStaleness />);
    await screen.findByTestId("list", {}, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "testing" }));
    await screen.findByText(/tagged testing/, {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "react" }));
    await screen.findByText(/tagged react/, {}, { timeout: 3000 });

    expect(requests).toHaveLength(2);
  });

  it("revalidates on a revisit when staleTime is 0, without a loading state", async () => {
    renderWithClient(<KeysAndStaleness />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await userEvent.selectOptions(screen.getByLabelText("staleTime"), "0");
    await userEvent.click(screen.getByRole("button", { name: "testing" }));
    await screen.findByText(/tagged testing/, {}, { timeout: 3000 });
    await userEvent.click(screen.getByRole("button", { name: "react" }));

    // Rows are on screen straight away from cache; the request goes out behind them.
    expect(screen.getByTestId("list")).toHaveTextContent("Rules of React");
    await screen.findByText(/refreshing/, {}, { timeout: 3000 });
  });
});
