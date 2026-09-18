import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { db } from "../api/db";
import { renderWithClient } from "../test-utils";
import { Optimistic } from "./04_optimistic";

const votes = (id: string) => Number(screen.getByTestId(`votes-${id}`).textContent);

async function voteForRulesOfReact() {
  await userEvent.click(screen.getByRole("button", { name: "vote for Rules of React" }));
}

describe("optimistic updates", () => {
  it("moves the number before the server has answered", async () => {
    renderWithClient(<Optimistic />);
    await screen.findByTestId("list", {}, { timeout: 3000 });
    expect(votes("1")).toBe(12);

    await voteForRulesOfReact();

    // The request takes 300ms. This is the guess.
    expect(votes("1")).toBe(13);

    // Then wait for it to land before ending the test. Without this the vote
    // arrives at the fake server *after* afterEach has reset the data, and the
    // next test starts one vote ahead. An in-flight request does not care that
    // your assertions are finished.
    await waitFor(() => expect(db.all()[0]?.votes).toBe(13), { timeout: 3000 });
  });

  it("ends up agreeing with the server", async () => {
    renderWithClient(<Optimistic />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await voteForRulesOfReact();
    // Waiting on the DOM here would prove nothing: the optimistic 13 is already
    // there. The server having 13 is the assertion.
    await waitFor(() => expect(db.all()[0]?.votes).toBe(13), { timeout: 3000 });

    expect(votes("1")).toBe(13);
  });

  it("puts the old number back when the write fails", async () => {
    renderWithClient(<Optimistic />);
    await screen.findByTestId("list", {}, { timeout: 3000 });

    await userEvent.click(screen.getByRole("button", { name: "Make the next vote fail" }));
    await voteForRulesOfReact();
    expect(votes("1")).toBe(13);

    await screen.findByText("rolled back", {}, { timeout: 3000 });
    await waitFor(() => expect(votes("1")).toBe(12), { timeout: 3000 });
  });
});
