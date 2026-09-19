import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Streaming } from "./03_streaming";

/**
 * The streaming itself is asserted in `src/render/stream.test.tsx`, which runs
 * in the node environment and checks the actual chunk boundaries. This file
 * checks the table, because a comparison table that drifts from the code it
 * describes is worse than none.
 */
describe("the comparison", () => {
  it("shows streaming painting before renderToString does", () => {
    render(<Streaming />);

    const rows = within(screen.getByTestId("flow")).getAllByRole("row").slice(1);
    const at100 = rows.find((row) => row.textContent?.includes("100ms"));
    const cells = within(at100 as HTMLElement).getAllByRole("cell");

    // At 100ms: renderToString has sent nothing, streaming has sent the shell.
    expect(cells[2]).toHaveTextContent("nothing yet");
    expect(cells[3]).toHaveTextContent("fallback");
  });

  it("shows the client-rendered page arriving last", () => {
    render(<Streaming />);

    const rows = within(screen.getByTestId("flow")).getAllByRole("row").slice(1);
    const last = rows.at(-1) as HTMLElement;

    expect(within(last).getAllByRole("cell")[1]).toHaveTextContent("whole page");
  });

  it("warns against awaiting allReady in the example", () => {
    render(<Streaming />);

    // The one mistake that turns streaming back into renderToString.
    expect(screen.getByText(/Do NOT await stream.allReady/)).toBeInTheDocument();
  });
});
