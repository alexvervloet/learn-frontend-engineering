import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ActionsAndOptimistic } from "./10_actions_and_optimistic";

const items = () =>
  within(screen.getByTestId("comments"))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");

async function post(text: string) {
  await userEvent.type(screen.getByRole("textbox", { name: "Comment" }), text);
  await userEvent.click(screen.getByRole("button", { name: "Post" }));
}

describe("optimistic updates", () => {
  it("shows the comment before the server has seen it", async () => {
    render(<ActionsAndOptimistic />);

    await post("hello");

    // The request takes 300ms, so this is the optimistic copy.
    expect(items()).toEqual(["first", "hello · sending"]);
  });

  it("replaces it with the saved one, without a flash of it disappearing", async () => {
    render(<ActionsAndOptimistic />);

    await post("hello");
    // Waiting for the text "hello" would resolve instantly against the
    // optimistic copy. The marker leaving is what says the real one landed.
    await waitForElementToBeRemoved(() => screen.queryByText(/sending/), { timeout: 2000 });

    expect(items()).toEqual(["first", "hello"]);
  });

  it("rolls the comment back when the action fails, with no rollback code", async () => {
    render(<ActionsAndOptimistic />);

    await post("please fail");
    expect(items()).toHaveLength(2);

    expect(await screen.findByRole("alert", {}, { timeout: 2000 })).toHaveTextContent("refused");
    expect(items()).toEqual(["first"]);
  });

  it("validates without going near the network", async () => {
    render(<ActionsAndOptimistic />);

    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("write something first");
    expect(items()).toEqual(["first"]);
  });
});
