import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SsgIsr } from "./04_ssg_isr";

/**
 * The store's own behaviour is tested properly in `src/render/ssg.test.ts`,
 * in the node environment. This file only checks that the simulator is wired
 * to the real store rather than to a mock of it, which is the thing that would
 * quietly stop being true.
 */
const log = () => screen.getByTestId("log").textContent ?? "";

/**
 * Scoped to the log element, not `findByText`. The lesson's prose mentions
 * "stale" and "hit" too, so an unscoped text query finds two nodes and throws
 * "Found multiple elements" rather than failing on the thing being tested.
 */
const waitForLog = (pattern: RegExp) => waitFor(() => expect(log()).toMatch(pattern));

describe("the simulator", () => {
  it("builds on the first request", async () => {
    render(<SsgIsr />);
    expect(log()).toBe("no requests yet");

    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));

    await waitForLog(/miss/);
    expect(log()).toContain("version 1");
  });

  it("serves a fresh copy without rebuilding", async () => {
    render(<SsgIsr />);

    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));
    await waitForLog(/miss/);
    await userEvent.click(screen.getByRole("button", { name: /Edit the content/ }));
    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));

    // Edited, but the stored copy is still inside the window.
    await waitForLog(/hit/);
    expect(log()).not.toContain("version 2");
  });

  it("serves stale once the clock passes the window", async () => {
    render(<SsgIsr />);

    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));
    await waitForLog(/miss/);

    await userEvent.click(screen.getByRole("button", { name: "Wait 30 seconds" }));
    await userEvent.click(screen.getByRole("button", { name: "Wait 30 seconds" }));
    await userEvent.click(screen.getByRole("button", { name: "Wait 30 seconds" }));
    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));

    await waitForLog(/stale/);
  });

  it("rebuilds immediately on publish", async () => {
    render(<SsgIsr />);

    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));
    await waitForLog(/miss/);
    await userEvent.click(screen.getByRole("button", { name: /Edit the content/ }));
    await userEvent.click(screen.getByRole("button", { name: /Publish/ }));
    await userEvent.click(screen.getByRole("button", { name: "Request the page" }));

    // No waiting out the window: the webhook dropped the stored copy.
    await waitForLog(/version 2/);
  });
});
