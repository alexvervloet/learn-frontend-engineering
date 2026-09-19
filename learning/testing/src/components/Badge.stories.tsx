import type { Meta, StoryObj } from "@storybook/react-vite";
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

/** A play function can drive an interaction, not just assert the initial state. */
export const CopiesOnClick: Story = {
  args: { children: "Click me", tone: "neutral" },
  render: (args) => {
    return (
      <div>
        <Badge {...args} />
        <button type="button" onClick={() => undefined} style={{ marginInlineStart: "0.5rem" }}>
          Copy
        </button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Copy" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Click me");
  },
};
