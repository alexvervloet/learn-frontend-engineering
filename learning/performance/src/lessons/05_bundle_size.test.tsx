import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BundleSize } from "./05_bundle_size";

describe("deferring the heavy component", () => {
  it("does not render the chart until it is asked for", () => {
    render(<BundleSize />);

    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  it("loads it on the click", async () => {
    render(<BundleSize />);

    await userEvent.click(screen.getByRole("button", { name: "Load the chart" }));

    expect(await screen.findByTestId("chart", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("gives the chart an accessible name, because an SVG has none by default", async () => {
    render(<BundleSize />);
    await userEvent.click(screen.getByRole("button", { name: "Load the chart" }));

    expect(
      await screen.findByRole("img", { name: /line chart/ }, { timeout: 2000 }),
    ).toBeInTheDocument();
  });
});

/**
 * The claim that the chart is a *separate chunk* is about the build, not about
 * the render, so it is checked against the source of the build config and the
 * import that creates the split point. Asserting on `dist/` would mean the
 * suite could only run after a build, which is a worse trade.
 */
describe("the build is set up to show you the answer", () => {
  const lessonSource = readFileSync(join(import.meta.dirname, "05_bundle_size.tsx"), "utf8");
  const viteConfig = readFileSync(join(import.meta.dirname, "..", "..", "vite.config.ts"), "utf8");

  it("splits the chart with a dynamic import", () => {
    // A static `import HeavyChart from "./05_heavy_chart"` would put it in the
    // initial bundle and nothing would warn.
    expect(lessonSource).toMatch(/lazy\(\(\) => import\("\.\/05_heavy_chart"\)\)/);
  });

  it("has an analyser wired to a script rather than a manual step", () => {
    expect(viteConfig).toContain("visualizer");
    // Behind a flag, so an ordinary build does not pay for it.
    expect(viteConfig).toContain("ANALYSE");
  });

  it("reports compressed sizes, which is what crosses the network", () => {
    expect(viteConfig).toContain("gzipSize");
    expect(viteConfig).toContain("brotliSize");
  });
});
