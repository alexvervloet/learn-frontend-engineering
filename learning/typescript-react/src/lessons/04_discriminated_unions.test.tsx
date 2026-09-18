import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe as suite, expect, it, vi } from "vitest";

import { Action, DiscriminatedUnions, describe as describeFeed } from "./04_discriminated_unions";

suite("exhaustive rendering", () => {
  it("has something to say about every state", () => {
    expect(describeFeed({ status: "idle" })).toBe("nothing requested yet");
    expect(describeFeed({ status: "loading", since: 1200 })).toBe("loading for 1200ms");
    expect(describeFeed({ status: "ready", items: ["a"] })).toBe("1 items");
    expect(describeFeed({ status: "failed", message: "no", canRetry: true })).toBe(
      "no (retryable)",
    );
    expect(describeFeed({ status: "failed", message: "no", canRetry: false })).toBe("no");
  });

  it("renders one line per state", () => {
    render(<DiscriminatedUnions />);

    expect(within(screen.getByTestId("states")).getAllByRole("listitem")).toHaveLength(4);
  });
});

suite("either/or props", () => {
  it("renders a link when given an href", () => {
    render(<Action label="Docs" href="https://react.dev" />);

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "https://react.dev");
  });

  it("renders a button when given a handler", async () => {
    const onClick = vi.fn();
    render(<Action label="Run" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
