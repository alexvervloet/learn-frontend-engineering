import axe, { type AxeResults, type Result } from "axe-core";

/**
 * A thin wrapper over axe-core, rather than a matcher library.
 *
 * `jest-axe` and `vitest-axe` both exist; this is about twenty lines and shows
 * what axe actually gives you, which is the point of lesson 05. The important
 * part is the reporting: axe's raw output is a deep object, and a test that
 * fails with "expected 3 to be 0" is useless. Naming the rule, the impact and
 * the offending element is the difference between a fix and a shrug.
 */
export type Violation = {
  id: string;
  impact: string;
  help: string;
  nodes: string[];
};

export async function analyse(container: Element): Promise<Violation[]> {
  const results: AxeResults = await axe.run(container, {
    // Colour contrast needs real rendering, and jsdom paints nothing, so axe
    // cannot evaluate it here and reports it as "incomplete" rather than
    // passing. Turning it off keeps the output honest about what was checked.
    rules: { "color-contrast": { enabled: false } },
  });

  return results.violations.map((violation: Result) => ({
    id: violation.id,
    impact: violation.impact ?? "unknown",
    help: violation.help,
    nodes: violation.nodes.map((node) => node.html),
  }));
}

/** A readable one-line summary per violation, for an assertion message. */
export function describeViolations(violations: Violation[]): string {
  if (violations.length === 0) return "no violations";

  return violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes.join("\n  ")}`,
    )
    .join("\n");
}
