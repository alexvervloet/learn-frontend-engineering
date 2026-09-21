import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { Badge } from "./Badge";

/**
 * A story is a component in one state, and that is worth more than it sounds.
 * Three things come out of the same file:
 *
 *   documentation   a browsable page per state, for people who are not going
 *                   to read the props type
 *   a test fixture  `composeStories` renders these in Vitest, so the states you
 *                   documented are the states you test
 *   an a11y check   the addon runs axe against each story as you view it
 *
 * The `play` function is the interesting part. It runs after the story renders,
 * using the same Testing Library queries as a unit test, so an interaction can
 * be documented and asserted in one place.
 */
const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Ready", tone: "neutral" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = {
  args: { tone: "success", children: "Passing" },
};

export const Danger: Story = {
  args: { tone: "danger", children: "Failing" },
};

/** A badge whose visible text is a number needs an accessible name of its own. */
export const NumericWithLabel: Story = {
  args: { tone: "danger", children: "3", label: "3 failing checks" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The visible text is "3". What gets announced is the label.
    await expect(canvas.getByRole("status", { name: "3 failing checks" })).toBeInTheDocument();
  },
};

/**
 * A component, not an inline `render`, because `render` holds state here.
 *
 * `render: () => { const [x] = useState() }` fails react-hooks/rules-of-hooks:
 * the rule keys off the name, and a lowercase `render` is neither a component
 * nor a hook as far as it can tell. The rule is right to complain. Storybook
 * calls `render` like a component, but nothing guarantees that, and the fix is
 * a line long.
 */
function RetryCounter() {
  const [retries, setRetries] = useState(0);
  const tone = retries >= 3 ? "danger" : "neutral";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <Badge tone={tone} label={`${String(retries)} retries`}>
        {retries === 0 ? "no retries" : `${String(retries)} retries`}
      </Badge>
      <button type="button" onClick={() => setRetries((count) => count + 1)}>
        Retry
      </button>
    </div>
  );
}

/**
 * A play function can drive an interaction, not just assert the initial state.
 *
 * The first version of this story had an `onClick` of `() => undefined` and
 * then asserted the badge still said what it said before the click. It could
 * not fail. A play function that asserts the initial state is a play function
 * you did not need, and it is worse than none: the story reads as covered.
 *
 * So the button changes something, and the assertion is about the thing that
 * changed. `findByText` rather than `getByText`, because the state update is
 * not flushed by the time `click` resolves.
 */
export const CountsRetries: Story = {
  args: { children: "0 retries", tone: "neutral" },
  render: () => <RetryCounter />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByRole("status");

    await expect(badge).toHaveTextContent("no retries");

    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(await canvas.findByText("1 retries")).toBeInTheDocument();

    // Three more, to cross the threshold the tone depends on. The accessible
    // name has to keep up with the visible text, which is the bug a badge
    // with an aria-label invites.
    for (let click = 0; click < 3; click += 1) {
      await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    }

    await expect(await canvas.findByRole("status", { name: "4 retries" })).toBeInTheDocument();
  },
};
