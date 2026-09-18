import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Rendering } from "./01_rendering";

const count = () => Number(screen.getByTestId("count").textContent);
const renders = () => Number(screen.getByTestId("renders").textContent);

describe("renders and commits", () => {
  it("batches three updates in one handler into a single render", async () => {
    render(<Rendering />);
    const before = renders();

    await userEvent.click(screen.getByRole("button", { name: "+3 in one handler" }));

    expect(count()).toBe(3);
    expect(renders()).toBe(before + 1);
  });

  it("batches updates scheduled from a timeout too, which React 17 did not", async () => {
    render(<Rendering />);
    const before = renders();

    await userEvent.click(screen.getByRole("button", { name: "+3 inside setTimeout" }));
    await screen.findByText("3");

    expect(renders()).toBe(before + 1);
  });

  it("stops re-rendering when the value does not change", async () => {
    render(<Rendering />);
    const before = renders();
    const button = screen.getByRole("button", { name: "Set the same value" });

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    // React may call the component once before it works out that nothing
    // changed, so the honest assertion is "not three more", not "no more".
    expect(renders()).toBeLessThanOrEqual(before + 1);
  });
});
