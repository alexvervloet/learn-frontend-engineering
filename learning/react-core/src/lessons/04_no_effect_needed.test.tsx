import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { NoEffectNeeded } from "./04_no_effect_needed";

const renders = (testId: string) => Number(screen.getByTestId(testId).textContent);
const results = (testId: string) =>
  within(screen.getByTestId(testId))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("deriving state instead of syncing it", () => {
  it("costs one extra render per keystroke when an effect mirrors the calculation", async () => {
    render(<NoEffectNeeded />);
    const effectBefore = renders("effect-renders");
    const derivedBefore = renders("derived-renders");

    await userEvent.type(screen.getByRole("textbox"), "re");

    expect(renders("effect-renders") - effectBefore).toBe(4);
    expect(renders("derived-renders") - derivedBefore).toBe(2);
  });

  it("ends up at the same answer, which is what makes the extra render pure waste", async () => {
    render(<NoEffectNeeded />);

    await userEvent.type(screen.getByRole("textbox"), "re");

    expect(results("effect-results")).toEqual(results("derived-results"));
    expect(results("derived-results")).toEqual(["react", "reducer", "ref", "render", "resume"]);
  });
});
