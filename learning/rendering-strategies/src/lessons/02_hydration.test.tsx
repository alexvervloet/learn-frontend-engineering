import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ClientOnlyTimestamp, StableGreeting, UnstableTimestamp } from "./02_hydration";

/**
 * A real hydration, in jsdom: render on "the server" with `renderToString`,
 * put the markup in a container, then `hydrateRoot` over it. That is what a
 * browser does with a server-rendered page, and it is the only way to see a
 * mismatch without running a server.
 *
 * Mismatches arrive through `onRecoverableError`, not `console.error`. Spying
 * on the console catches nothing here: React 19 hands recoverable errors to
 * that callback and only logs them if you have not supplied one. Which is also
 * the answer for production. `onRecoverableError` on `hydrateRoot` is where
 * you send hydration mismatches to Sentry, and without it they exist only in
 * the consoles of users who are not looking.
 */
async function serverThenHydrate(element: React.ReactElement): Promise<{
  container: HTMLElement;
  serverHtml: string;
  errors: string[];
}> {
  const serverHtml = renderToString(element);

  const container = document.createElement("div");
  container.innerHTML = serverHtml;
  document.body.append(container);

  const errors: string[] = [];

  await act(async () => {
    hydrateRoot(container, element, {
      onRecoverableError: (error) => {
        errors.push(error instanceof Error ? error.message : String(error));
      },
    });
  });

  // The mismatch is reported after the synchronous hydration returns, so one
  // more flush is needed before reading `errors`.
  await act(async () => {
    await Promise.resolve();
  });

  return { container, serverHtml, errors };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("a clean hydration", () => {
  it("reuses the server's DOM rather than rebuilding it", () => {
    const serverHtml = renderToString(<StableGreeting name="Ada" />);
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    document.body.append(container);

    // Hold on to the node the server's markup produced.
    const before = container.querySelector('[data-testid="stable"]');

    act(() => {
      hydrateRoot(container, <StableGreeting name="Ada" />);
    });

    // The same node. Hydration attached handlers to it; it did not replace it.
    expect(container.querySelector('[data-testid="stable"]')).toBe(before);
  });

  it("reports nothing", async () => {
    const { errors } = await serverThenHydrate(<StableGreeting name="Ada" />);

    expect(errors.filter((message) => /hydrat/i.test(message))).toHaveLength(0);
  });
});

describe("a mismatch", () => {
  it("is reported", async () => {
    const { errors } = await serverThenHydrate(<UnstableTimestamp />);

    // Date.now() on the server, a different Date.now() a moment later on the
    // client. React notices.
    expect(errors.some((message) => /hydrat/i.test(message))).toBe(true);
  });

  it("recovers, which is why these ship unnoticed", async () => {
    const { container } = await serverThenHydrate(<UnstableTimestamp />);

    // The page looks right. React threw the server's subtree away and
    // re-rendered it on the client, at the cost of the work the server did.
    expect(container.querySelector('[data-testid="unstable"]')?.textContent).toMatch(
      /Rendered at \d+/,
    );
  });
});

describe("the fix", () => {
  it("renders the same thing on both, so hydration is clean", async () => {
    const serverHtml = renderToString(<ClientOnlyTimestamp />);

    // No time in the markup at all: the placeholder is what the server sent.
    expect(serverHtml).toContain("Rendered at …");
    expect(serverHtml).not.toMatch(/\d{2}:\d{2}/);

    const { errors } = await serverThenHydrate(<ClientOnlyTimestamp />);
    expect(errors.filter((message) => /hydrat/i.test(message))).toHaveLength(0);
  });

  it("fills in the value after mounting", async () => {
    const { container } = await serverThenHydrate(<ClientOnlyTimestamp />);

    // The effect ran inside act, so by now the real time is on screen.
    expect(container.querySelector('[data-testid="client-only"]')?.textContent).toMatch(/\d/);
  });
});
