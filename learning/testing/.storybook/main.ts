import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Storybook 10 with the Vite builder, which reuses this module's own
 * vite.config.ts. That is the whole reason to use the Vite framework package:
 * a story renders through the same plugins, aliases and transforms as the app,
 * so a component that works in Storybook works in the app.
 */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    // Runs axe against every story as you look at it, and reports violations
    // in a panel. Catching a contrast or labelling problem in the component,
    // before it is used anywhere, is much cheaper than catching it in a page.
    "@storybook/addon-a11y",
  ],
  framework: { name: "@storybook/react-vite", options: {} },
};

export default config;
