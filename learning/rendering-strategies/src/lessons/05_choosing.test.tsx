import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Choosing } from "./05_choosing";

describe("the decision table", () => {
  it("covers every strategy the module teaches", () => {
    render(<Choosing />);

    const table = within(screen.getByTestId("strategies"));
    for (const strategy of ["CSR", "SSR", "Streaming SSR", "SSG", "ISR"]) {
      expect(table.getByText(strategy)).toBeInTheDocument();
    }
  });

  it("names a cost for each one, because there is no free option", () => {
    render(<Choosing />);

    const rows = within(screen.getByTestId("strategies")).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      expect(cells).toHaveLength(4);
      // The last column is the cost, and none of them is empty.
      expect(cells[3]?.textContent?.trim().length ?? 0).toBeGreaterThan(10);
    }
  });
});
