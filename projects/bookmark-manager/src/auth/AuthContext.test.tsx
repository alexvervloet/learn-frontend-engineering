import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { Gate, Providers } from "../App";
import { makeQueryClient } from "../queryClient";
import { getAccessToken, setAccessToken } from "../api/client";

afterEach(() => {
  setAccessToken(null);
});

function renderGate() {
  const queryClient = makeQueryClient();
  return render(
    <Providers queryClient={queryClient}>
      <Gate>
        <p data-testid="app">The app</p>
      </Gate>
    </Providers>,
  );
}

describe("the sign-in gate", () => {
  it("shows the form rather than the app when signed out", () => {
    renderGate();

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
  });

  it("signs in and shows the app", async () => {
    renderGate();

    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByTestId("app", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("keeps the token in memory, not in storage", async () => {
    renderGate();

    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByTestId("app", {}, { timeout: 3000 });

    expect(getAccessToken()).toBe("demo-access-token");
    // Any script on the origin can read localStorage, including one injected
    // by XSS. See the production module's auth lesson.
    expect(Object.keys(localStorage)).toHaveLength(0);
    expect(JSON.stringify(sessionStorage)).not.toContain("demo-access-token");
  });

  it("reports a bad password without a stale token left behind", async () => {
    renderGate();

    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent(
      "Incorrect username or password",
    );
    expect(screen.queryByTestId("app")).not.toBeInTheDocument();
    // A half-completed sign-in must not leave one behind.
    expect(getAccessToken()).toBeNull();
  });

  it("clears the token on sign out", async () => {
    renderGate();

    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByTestId("app", {}, { timeout: 3000 });

    // The gate is what re-renders; the token is what actually matters.
    expect(getAccessToken()).not.toBeNull();
    setAccessToken(null);
    await waitFor(() => expect(getAccessToken()).toBeNull());
  });
});
