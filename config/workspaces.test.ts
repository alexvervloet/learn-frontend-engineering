import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * One invariant, and it is here because it was broken twice by the same
 * mistake.
 *
 * Vitest's default `include` matches `*.spec.ts` as well as `*.test.ts`, and
 * `e2e/` is full of `*.spec.ts` files written against Playwright's `test`
 * export. When Vitest picks one up the failure is:
 *
 *   Playwright Test did not expect test.describe() to be called here.
 *   Most common reasons include: …
 *
 * and none of the reasons it lists is the real one. `learning/testing` hit it
 * first and left a comment explaining the fix in its own config, where the
 * next person to add an `e2e/` directory will not read it. This asserts it
 * instead.
 *
 * Two spellings count as fixed, because both genuinely are: an `exclude` that
 * names `e2e`, or an `include` narrow enough that nothing in `e2e/` can match.
 */
const root = new URL("../", import.meta.url);

function workspacesWithBrowserSpecs(): string[] {
  const found: string[] = [];

  for (const group of ["web-fundamentals", "learning", "projects", "packages"]) {
    const groupPath = fileURLToPath(new URL(group, root));
    if (!existsSync(groupPath)) continue;

    const candidates = existsSync(fileURLToPath(new URL(`${group}/e2e`, root)))
      ? [group]
      : readdirSync(groupPath, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => `${group}/${entry.name}`);

    for (const candidate of candidates) {
      if (existsSync(fileURLToPath(new URL(`${candidate}/e2e`, root)))) found.push(candidate);
    }
  }

  return found;
}

const workspaces = workspacesWithBrowserSpecs();

describe("workspaces with a Playwright suite", () => {
  it("finds the ones that have one at all", () => {
    // If this drops to zero the checks below are vacuously true, which is the
    // failure mode of every test that discovers its own subjects.
    expect(workspaces.length).toBeGreaterThan(4);
  });

  it.each(workspaces)("%s keeps e2e/ out of Vitest", (workspace) => {
    const configPath = fileURLToPath(new URL(`${workspace}/vitest.config.ts`, root));

    // No Vitest config at all means no Vitest run, which is fine: the two
    // framework modules are Playwright-only and say so in their READMEs.
    if (!existsSync(configPath)) return;

    const config = readFileSync(configPath, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

    const excludesE2e = /exclude:\s*\[[^\]]*["']e2e/.test(config);
    const includeIsNarrow =
      /include:\s*\[[^\]]*\]/.test(config) && !/include:\s*\[[^\]]*e2e/.test(config);

    expect(
      excludesE2e || includeIsNarrow,
      `${workspace}/vitest.config.ts neither excludes e2e/ nor restricts include to something outside it`,
    ).toBe(true);
  });
});
