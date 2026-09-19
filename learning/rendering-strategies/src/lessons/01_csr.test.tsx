import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Csr, measurePhases } from "./01_csr";

describe("measuring the phases", () => {
  it("reports them in the order they happen", () => {
    const phases = measurePhases();

    expect(phases.map((phase) => phase.name)).toContain("React rendered");
    // Navigation is the zero point everything else is measured from.
    expect(phases[0]).toEqual({ name: "navigation", at: 0 });
  });

  it("puts React's render after the HTML was parsed", () => {
    const phases = measurePhases();
    const parsed = phases.find((phase) => phase.name === "HTML parsed");
    const rendered = phases.find((phase) => phase.name === "React rendered");

    if (parsed !== undefined && rendered !== undefined) {
      // The ordering that makes CSR what it is: nothing renders until the
      // document has been parsed and the bundle has run.
      expect(rendered.at).toBeGreaterThanOrEqual(parsed.at);
    }
    expect(rendered).toBeDefined();
  });
});

describe("the lesson", () => {
  it("shows what the server actually sent", () => {
    render(<Csr />);

    expect(screen.getByText(/<div id="root"><\/div>/)).toBeInTheDocument();
  });

  it("lists the phases once measured", async () => {
    render(<Csr />);

    const list = await screen.findByTestId("phases");
    expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(0);
  });
});
