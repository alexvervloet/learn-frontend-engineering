import { composeStories } from "@storybook/react-vite";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as stories from "./Badge.stories";

/**
 * `composeStories` applies the meta's args, decorators and parameters and hands
 * back plain components. The states documented in Storybook are then the exact
 * states under test, so the two cannot drift: delete a story and this file
 * stops compiling.
 *
 * The `play` function is run against a container Testing Library created,
 * rather than with `Story.run()`. `run()` mounts the story into a root of its
 * own that RTL's `cleanup` knows nothing about, so every story left its DOM
 * behind and later tests failed with "Found multiple elements with the role
 * status". Rendering first and passing the container keeps teardown working.
 */
const { Neutral, Success, Danger, NumericWithLabel, CopiesOnClick } = composeStories(stories);

describe("every documented state renders", () => {
  it("neutral", () => {
    render(<Neutral />);
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
  });

  it("success", () => {
    render(<Success />);
    expect(screen.getByRole("status")).toHaveTextContent("Passing");
  });

  it("danger", () => {
    render(<Danger />);
    expect(screen.getByRole("status")).toHaveTextContent("Failing");
  });
});

describe("the play functions", () => {
  it("runs the numeric badge's assertion headlessly", async () => {
    const { container } = render(<NumericWithLabel />);

    // `play` is optional on a Story, so it needs a guard. Asserting it exists
    // first matters: `await Story.play?.(…)` on a story that lost its play
    // function would pass silently and prove nothing.
    expect(NumericWithLabel.play).toBeDefined();
    await NumericWithLabel.play?.({ canvasElement: container });

    expect(screen.getByRole("status", { name: "3 failing checks" })).toBeInTheDocument();
  });

  it("runs the interaction story", async () => {
    const { container } = render(<CopiesOnClick />);

    expect(CopiesOnClick.play).toBeDefined();
    await CopiesOnClick.play?.({ canvasElement: container });

    expect(screen.getByRole("status")).toHaveTextContent("Click me");
  });
});

describe("the badge itself", () => {
  it("announces changes, because a status that changes silently is not a status", () => {
    render(<Neutral />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("prefers an explicit label over the visible text when given one", () => {
    render(<NumericWithLabel />);

    expect(screen.getByRole("status")).toHaveAccessibleName("3 failing checks");
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });
});
