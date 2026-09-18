// Flat config, applied to every workspace from the repo root.
//
// The rules that matter most here are react-hooks/*. They catch the mistakes
// that produce stale closures and infinite effect loops, which are the two bugs
// beginners lose the most time to. react-compiler is part of the same plugin
// from v6 on: it reports components the React Compiler cannot optimise, which is
// also a decent proxy for "this component breaks the rules of React".
import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier/flat";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.astro/**",
      "**/storybook-static/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // `configs.recommended` is still the eslintrc shape. The flat versions live
  // under `configs.flat`, and `recommended-latest` is the one that includes the
  // React Compiler rule.
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-refresh": reactRefresh },
    rules: {
      // Fast Refresh can only swap a module that exports components and nothing
      // else. Exporting a constant alongside them silently turns hot reload into
      // a full page reload, which is maddening to debug.
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Lesson files log deliberately; that is half of what they teach.
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Lesson files export the component *and* the pure helpers their tests
    // import: a reducer, a parser, a hook. Fast Refresh falls back to a full
    // reload for those files, which is the right trade here. Nobody is
    // hot-editing a finished lesson, and a function you can test without a DOM
    // is worth more than hot reload on it.
    files: ["learning/*/src/lessons/**", "packages/*/src/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // In a type test the expression *is* the assertion. `withSatisfies.typo;`
    // under a @ts-expect-error asserts that the key does not exist, and there
    // is nothing to assign it to.
    files: ["**/*.test-d.ts", "**/*.test-d.tsx"],
    rules: { "@typescript-eslint/no-unused-expressions": "off" },
  },
  prettier,
);
