import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ReducerStateMachine, submitReducer, type SubmitState } from "./08_reducer_state_machine";

// The reducer is a pure function, so most of the flow needs no DOM at all.
// This is the practical reason to use one: the logic is testable on its own.
describe("submitReducer", () => {
  it("ignores a second submit while one is in flight", () => {
    const inFlight: SubmitState = { status: "submitting", email: "a@b.c" };

    expect(submitReducer(inFlight, { type: "submit", email: "other@b.c" })).toBe(inFlight);
  });

  it("ignores a response that arrives after a reset", () => {
    const idle: SubmitState = { status: "idle" };

    expect(submitReducer(idle, { type: "resolved", message: "late" })).toBe(idle);
  });

  it("carries the email into the error state so retry can reuse it", () => {
    const submitting = submitReducer({ status: "idle" }, { type: "submit", email: "a@b.c" });
    const failed = submitReducer(submitting, { type: "rejected", message: "nope" });

    expect(failed).toEqual({ status: "error", message: "nope", email: "a@b.c" });
    expect(submitReducer(failed, { type: "retry" })).toEqual({
      status: "submitting",
      email: "a@b.c",
    });
  });

  it("does nothing on retry from anywhere but an error", () => {
    const success: SubmitState = { status: "success", message: "done" };

    expect(submitReducer(success, { type: "retry" })).toBe(success);
  });
});

describe("the form", () => {
  it("fails, then succeeds on retry, and never shows both at once", async () => {
    render(<ReducerStateMachine />);

    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(screen.getByTestId("status")).toHaveTextContent("submitting");

    const alert = await screen.findByRole("alert", {}, { timeout: 2000 });
    expect(alert).toHaveTextContent("the network ate it");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("status", {}, { timeout: 2000 })).toHaveTextContent(
      "subscribed",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
