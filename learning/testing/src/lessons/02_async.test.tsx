import { render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Loader } from "./02_async";

describe("the three query kinds", () => {
  it("findBy waits, so no waitFor wrapper is needed", async () => {
    render(<Loader />);

    // getByTestId("items") here would throw immediately.
    expect(await screen.findByTestId("items")).toHaveTextContent("alpha");
  });

  it("queryBy is for absence, and only for absence", async () => {
    render(<Loader />);

    // Right use: the thing is deliberately not there yet.
    expect(screen.queryByTestId("items")).not.toBeInTheDocument();

    await screen.findByTestId("items");

    // Wrong use would be expect(queryBy...).toBeInTheDocument(): when it fails
    // the message is "expected null to be in the document" and prints no DOM.
    expect(screen.getByTestId("items")).toBeInTheDocument();
  });

  it("waitForElementToBeRemoved asserts it was there first", async () => {
    render(<Loader />);

    // Stronger than waiting for the list: this fails if the spinner never
    // rendered, which is the bug where loading state is silently skipped.
    await waitForElementToBeRemoved(() => screen.queryByTestId("spinner"));

    expect(screen.getByTestId("items")).toBeInTheDocument();
  });

  it("throws rather than passing when the element was never there", async () => {
    render(<Loader delay={0} />);
    await screen.findByTestId("items");

    await expect(
      waitForElementToBeRemoved(() => screen.queryByTestId("never-existed")),
    ).rejects.toThrow(/was already removed|given to waitForElement|could not be found/i);
  });
});

describe("waitFor", () => {
  it("is for assertions that are not about finding an element", async () => {
    const onSettled = vi.fn();

    function Watcher() {
      const found = screen.queryByTestId("items") !== null;
      if (found) onSettled();
      return null;
    }

    render(
      <>
        <Loader />
        <Watcher />
      </>,
    );

    // A spy having been called is not a DOM query, so findBy cannot express it.
    await waitFor(() => expect(screen.getByTestId("items")).toBeInTheDocument());
    expect(screen.getByTestId("items")).toBeInTheDocument();
  });

  it("runs its callback repeatedly, which is why side effects do not belong in it", async () => {
    let calls = 0;
    render(<Loader />);

    await waitFor(() => {
      calls += 1;
      expect(screen.getByTestId("items")).toBeInTheDocument();
    });

    // More than one on any machine slow enough to matter. A userEvent.click in
    // here would have fired that many times.
    expect(calls).toBeGreaterThanOrEqual(1);
  });
});

describe("the error path", () => {
  it("is announced, not just rendered", async () => {
    render(<Loader shouldFail />);

    expect(await screen.findByRole("alert")).toHaveTextContent("it went wrong");
    expect(screen.queryByTestId("items")).not.toBeInTheDocument();
  });
});
