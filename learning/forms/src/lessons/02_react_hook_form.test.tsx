import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReactHookForm } from "./02_react_hook_form";

const renders = () => Number(screen.getByTestId("rhf-renders").textContent);

describe("why it is fast", () => {
  it("re-renders once for fifteen keystrokes, and that once is worth understanding", async () => {
    render(<ReactHookForm />);
    const before = renders();

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");

    // Fifteen characters, one render. The value itself lives in the DOM, so
    // React is never told about it. The single render is `isDirty` flipping
    // false → true on the first keystroke, and this component reads `isDirty`,
    // so the formState Proxy subscribed it. Stop reading `isDirty` and this
    // becomes zero.
    expect(renders()).toBe(before + 1);
  });

  it("re-renders not at all for the keystrokes after that", async () => {
    render(<ReactHookForm />);
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "a");
    const afterDirty = renders();

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "da@example.com");

    // Already dirty, so nothing it subscribes to changes again.
    expect(renders()).toBe(afterDirty);
  });

  it("does re-render when something it subscribed to changes", async () => {
    render(<ReactHookForm />);
    const before = renders();

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // `errors` was read in this component, so errors appearing wakes it.
    await screen.findByText("an email is required");
    expect(renders()).toBeGreaterThan(before);
  });
});

describe("when validation runs", () => {
  it("stays quiet until the first submit", async () => {
    render(<ReactHookForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "nope");

    // Nagging someone about an email they are halfway through typing is the
    // reason the default is onSubmit.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("re-validates as they fix it, once it has complained", async () => {
    render(<ReactHookForm />);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("an email is required")).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");

    await waitFor(() => expect(screen.queryByText("an email is required")).not.toBeInTheDocument());
  });

  it("reports every invalid field, not just the first", async () => {
    render(<ReactHookForm />);

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "nope");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("that does not look like an email")).toBeInTheDocument();
    expect(screen.getByText("at least 8 characters")).toBeInTheDocument();
  });
});

describe("submitting", () => {
  it("does not call the handler when the form is invalid", async () => {
    const onValid = vi.fn();
    render(<ReactHookForm onValid={onValid} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("an email is required");

    expect(onValid).not.toHaveBeenCalled();
  });

  it("hands over the values, including the Controller field", async () => {
    const onValid = vi.fn();
    render(<ReactHookForm onValid={onValid} />);

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "longenough");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Plan" }), "pro");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "longenough",
        plan: "pro",
      }),
    );
  });

  it("tracks dirtiness, which is what an unsaved-changes prompt needs", async () => {
    render(<ReactHookForm />);
    expect(screen.getByTestId("dirty")).toHaveTextContent("no changes");

    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "a");

    // isDirty is read in this component, so it is subscribed despite typing
    // otherwise causing no renders.
    await waitFor(() => expect(screen.getByTestId("dirty")).toHaveTextContent("unsaved changes"));
  });
});
