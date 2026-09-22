import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PORTS, type WorkspaceName } from "./ports";

/**
 * The root README makes a promise on behalf of eighteen other files:
 *
 *   "Every workspace has its own port, listed in config/ports.ts and named in
 *    its own README, so several can run at once."
 *
 * It was not true. Eleven of the fourteen learning modules named no port at
 * all, so a reader who wanted the URL had to go and find this file, which is
 * the errand the sentence exists to save them.
 *
 * Prose about configuration goes stale the moment the configuration moves, and
 * it goes stale silently, because nothing runs a README. So the promise is a
 * test now. Add a workspace and forget its README and this fails by name.
 */
const root = new URL("../", import.meta.url);

function readmeFor(name: WorkspaceName): { path: string; text: string } {
  const candidates = [
    `learning/${name}/README.md`,
    `projects/${name}/README.md`,
    `${name}/README.md`,
  ];

  for (const candidate of candidates) {
    const path = fileURLToPath(new URL(candidate, root));
    if (existsSync(path)) return { path: candidate, text: readFileSync(path, "utf8") };
  }

  throw new Error(`no README found for the workspace "${name}"`);
}

const workspaces = Object.keys(PORTS) as WorkspaceName[];

describe("config/ports.ts", () => {
  it("gives every workspace a port nobody else has", () => {
    const assigned = Object.values(PORTS);

    // Two workspaces on one port is the exact failure this file was written to
    // prevent: the second dev server silently moves to the next free number
    // and every README naming the first one is quietly wrong.
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it.each(workspaces)("%s names its own port in its own README", (name) => {
    const { path, text } = readmeFor(name);

    expect(text, `${path} does not mention http://localhost:${PORTS[name]}`).toContain(
      `localhost:${PORTS[name]}`,
    );
  });

  it.each(workspaces)("%s does not name another workspace's port", (name) => {
    const { path, text } = readmeFor(name);

    // Storybook's 6006 and a backend on 8000 are fine. What is not fine is a
    // README pointing at the dev server of a different module, which is what
    // you get by copying a neighbouring README and editing only the name.
    const others = workspaces
      .filter((other) => other !== name)
      .map((other) => PORTS[other])
      .filter((port) => text.includes(`localhost:${port}`));

    expect(others, `${path} points at ports belonging to another workspace`).toEqual([]);
  });
});
