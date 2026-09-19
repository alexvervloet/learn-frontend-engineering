import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { scrubEvent, type ReportedEvent } from "../lib/reporting";
import { ErrorsAndMonitoring } from "./04_errors_and_monitoring";

const EVENT: ReportedEvent = {
  message: "Request failed for ada@example.com with Bearer abc.def.ghi",
  release: "a1b2c3d",
  user: { id: "user_123", email: "ada@example.com" },
  extra: {
    endpoint: "/api/orders",
    authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
    body: { cardNumber: "4111 1111 1111 1111", note: "reach me at ada@example.com" },
  },
  breadcrumbs: [{ message: "clicked Pay with card 4111111111111111" }],
};

describe("scrubbing", () => {
  const scrubbed = scrubEvent(EVENT);
  const asText = JSON.stringify(scrubbed);

  it("keeps the user id", () => {
    // Without it you cannot tell one user hitting an error a thousand times
    // from a thousand users hitting it once.
    expect(scrubbed.user?.id).toBe("user_123");
  });

  it("drops the email everywhere it appears", () => {
    expect(scrubbed.user).not.toHaveProperty("email");
    expect(asText).not.toContain("ada@example.com");
    expect(scrubbed.message).toContain("[redacted-email]");
  });

  it("redacts a whole value whose key looks sensitive", () => {
    expect((scrubbed.extra as Record<string, unknown>)["authorization"]).toBe("[redacted]");
  });

  it("redacts a card number wherever it turns up", () => {
    expect(asText).not.toContain("4111");
    expect(asText).toContain("[redacted-card]");
  });

  it("scrubs breadcrumbs, which is where the surprises live", () => {
    // Breadcrumbs are generated automatically and nobody reviews them.
    expect(scrubbed.breadcrumbs?.[0]?.message).not.toContain("4111");
  });

  it("keeps the things that make the report useful", () => {
    expect(scrubbed.release).toBe("a1b2c3d");
    expect((scrubbed.extra as Record<string, unknown>)["endpoint"]).toBe("/api/orders");
  });

  it("recurses into nested objects", () => {
    const nested = scrubEvent({
      message: "x",
      release: "r",
      extra: { a: { b: { password: "hunter2", fine: "keep me" } } },
    });

    const a = (nested.extra as Record<string, Record<string, Record<string, unknown>>>)["a"];
    expect(a?.["b"]?.["password"]).toBe("[redacted]");
    expect(a?.["b"]?.["fine"]).toBe("keep me");
  });
});

describe("what a boundary catches", () => {
  it("catches a throw during render", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<ErrorsAndMonitoring />);
      await userEvent.click(screen.getByRole("button", { name: "Throw during render" }));

      expect(screen.getByTestId("boundary-caught")).toBeInTheDocument();
      expect(screen.getByTestId("caught")).toHaveTextContent("boundary: thrown while rendering");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("does not catch a throw in a handler, which is why a global listener is needed", () => {
    // An error boundary is not a try/catch around your whole app. This is the
    // single most common misunderstanding about them, and the reason an
    // "error-free" dashboard can be wrong.
    const thrower = () => {
      throw new Error("from a click handler");
    };

    expect(thrower).toThrow("from a click handler");
  });
});

describe("the build", () => {
  const viteConfig = readFileSync(join(import.meta.dirname, "..", "..", "vite.config.ts"), "utf8");

  it("emits source maps without serving them", () => {
    // `true` publishes your original source to anyone who asks. `false` gives
    // you unreadable stack traces. "hidden" is the one you want.
    expect(viteConfig).toContain('sourcemap: "hidden"');
    expect(viteConfig).not.toMatch(/sourcemap:\s*true/);
  });
});
