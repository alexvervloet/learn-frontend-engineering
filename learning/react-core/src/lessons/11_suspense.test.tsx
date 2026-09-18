import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SuspenseAndUse } from "./11_suspense";

/**
 * Testing a component that suspends takes two `act` calls, and the reason is
 * worth knowing before you lose an hour to it.
 *
 * Testing Library's `render` runs its work inside a *synchronous* `act`. A
 * component that suspends inside one of those leaves React unable to retry:
 * it prints "A component suspended inside an `act` scope, but the `act` call
 * was not awaited" to stderr and then sits on the fallback forever, so
 * `findByTestId` polls a tree nobody is going to touch and fails after its
 * timeout.
 *
 * Giving `render` its own awaited `act`, and the waiting a second one, fixes it.
 * Fake timers do not: the problem is the shape of the act scope, not the clock.
 */
async function mount() {
  await act(async () => {
    render(<SuspenseAndUse />);
  });
}

/** A click that makes something suspend needs the same treatment as the mount. */
async function click(element: HTMLElement) {
  await act(async () => {
    await userEvent.click(element);
  });
}

const button = (name: string) => screen.getByRole("button", { name });

async function settle(ms = 500) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("Suspense and use", () => {
  it("shows the fallback, then the value the promise resolved to", async () => {
    await mount();
    expect(screen.getByTestId("bio-fallback")).toBeInTheDocument();

    await settle();

    expect(screen.getByTestId("bio")).toHaveTextContent("Lovelace");
    expect(screen.queryByTestId("bio-fallback")).not.toBeInTheDocument();
  });

  it("serves a second visit from the cache with no fallback at all", async () => {
    await mount();
    await settle();

    await click(button("Grace"));
    await settle();
    expect(screen.getByTestId("bio")).toHaveTextContent("Hopper");

    await click(button("Ada"));

    // The promise is already settled, so React never suspends. Nothing is
    // awaited between the click and this assertion, which is the point.
    expect(screen.queryByTestId("bio-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("bio")).toHaveTextContent("Lovelace");
  });

  it("keeps the old bio on screen when the switch happens in a transition", async () => {
    await mount();
    await settle();

    await click(screen.getByRole("checkbox"));
    await click(button("Alan"));

    // Alan has never been loaded, so without the transition this would be the
    // fallback. Inside one, React holds the previous content.
    expect(screen.queryByTestId("bio-fallback")).not.toBeInTheDocument();
    expect(screen.getByTestId("bio")).toHaveTextContent("Lovelace");

    await settle();
    expect(screen.getByTestId("bio")).toHaveTextContent("Turing");
  });

  it("downloads the lazy chunk only once something renders it", async () => {
    await mount();
    await settle();

    expect(screen.queryByText(/its own JavaScript chunk/)).not.toBeInTheDocument();

    await click(button("Load the lazy panel"));
    await settle();

    expect(screen.getByText(/its own JavaScript chunk/)).toBeInTheDocument();
  });
});
