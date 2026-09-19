import { LessonShell, defineLessons } from "@lab/lesson-shell";

import { CssModules } from "./lessons/01_css_modules";
import { TailwindTheme } from "./lessons/02_tailwind_theme";
import { DesignTokens } from "./lessons/03_design_tokens";
import { ContainerQueries } from "./lessons/04_container_queries";
import { CascadeLayers } from "./lessons/05_cascade_layers";
import { Variants } from "./lessons/06_variants";
import { Motion } from "./lessons/07_motion";

const lessons = defineLessons([
  {
    id: "01-css-modules",
    group: "Writing the CSS",
    title: "CSS modules",
    summary: "Two files both defining .title, and neither of them wins, because neither survives.",
    file: "src/lessons/01_css_modules.tsx",
    Component: CssModules,
  },
  {
    id: "02-tailwind-theme",
    group: "Writing the CSS",
    title: "Tailwind 4 and @theme",
    summary: "No config file. A token in CSS becomes a custom property and a family of utilities.",
    file: "src/lessons/02_tailwind_theme.tsx",
    Component: TailwindTheme,
  },
  {
    id: "03-design-tokens",
    group: "Writing the CSS",
    title: "Design tokens and dark mode",
    summary: "Components use roles, not values. Theming is then reassignment, in one file.",
    file: "src/lessons/03_design_tokens.tsx",
    Component: DesignTokens,
  },
  {
    id: "04-container-queries",
    group: "Modern layout",
    title: "Container queries",
    summary: "A card cares how much room it was given, not how wide the window is.",
    file: "src/lessons/04_container_queries.tsx",
    Component: ContainerQueries,
  },
  {
    id: "05-cascade-layers",
    group: "Modern layout",
    title: "Cascade layers",
    summary: "Layer order beats specificity, and unlayered CSS beats every layer.",
    file: "src/lessons/05_cascade_layers.tsx",
    Component: CascadeLayers,
  },
  {
    id: "06-variants",
    group: "Building components",
    title: "Variants with cva",
    summary: "A typed variant table, and a className prop that actually overrides.",
    file: "src/lessons/06_variants.tsx",
    Component: Variants,
  },
  {
    id: "07-motion",
    group: "Building components",
    title: "Animation and reduced motion",
    summary: "CSS first, a library for what CSS cannot do, and a cross-fade for people who ask.",
    file: "src/lessons/07_motion.tsx",
    Component: Motion,
  },
]);

export function App() {
  return (
    <LessonShell
      title="Styling"
      subtitle="CSS modules, Tailwind 4, tokens, layers, variants, motion"
      lessons={lessons}
    />
  );
}
