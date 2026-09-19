import type { Preview } from "@storybook/react-vite";

import "@lab/lesson-shell/styles.css";

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
    a11y: {
      // "todo" reports violations without failing. "error" fails the story in
      // a test run, which is what you want once a component is clean.
      test: "error",
    },
  },
};

export default preview;
