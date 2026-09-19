import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Compiler } from "./02_compiler";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);

/**
 * These assertions only hold because `vitest.config.ts` enables the compiler.
 * Without it both counters move together and every test here fails, which is
 * the point: the claim is about the build, so the test has to run the build.
 */
const parentButtons = () => screen.getAllByRole("button", { name: /Re-render this parent/ });

async function clickParent(index: number, times: number) {
  for (let i = 0; i < times; i += 1) {
    await userEvent.click(parentButtons()[index] as HTMLElement);
  }
}

describe("what the compiler does without being asked", () => {
  it("skips a child whose props did not change", async () => {
    render(<Compiler />);
    const before = renders("compiled-renders");

    await clickParent(0, 3);

    // No memo and no useCallback in the file. The compiler cached the inline
    // arrow and the element, so React saw the same object and skipped the
    // child entirely.
    expect(renders("compiled-renders")).toBe(before);
  });

  it("still re-renders it when a prop really changes", async () => {
    render(<Compiler />);
    const before = renders("compiled-renders");

    await userEvent.click(screen.getByRole("button", { name: /Change the label/ }));

    expect(renders("compiled-renders")).toBe(before + 1);
    expect(screen.getAllByText(/changed/).length).toBeGreaterThan(0);
  });
});

describe('"use no memo"', () => {
  it("re-renders its child on every parent render, which is what it used to be like", async () => {
    render(<Compiler />);
    const before = renders("uncompiled-renders");

    await clickParent(1, 3);

    expect(renders("uncompiled-renders")).toBe(before + 3);
  });

  it("is the whole difference between two otherwise identical trees", async () => {
    render(<Compiler />);

    await clickParent(0, 2);
    await clickParent(1, 2);

    // Same child, same props, same number of parent renders. One directive
    // apart, and the caching is in the parent, not the child.
    expect(renders("compiled-renders")).toBeLessThan(renders("uncompiled-renders"));
  });
});
