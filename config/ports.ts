/**
 * One dev-server port per workspace, in one place.
 *
 * Vite defaults every project to 5173 and silently moves to 5174 when that is
 * taken, so before this file two modules could not both be running with their
 * READMEs still true, and `npm run e2e` could land on whichever server
 * happened to answer.
 *
 * The Playwright configs read from here as well. That is the point: a module
 * has one port, its README names it, its dev server binds it, and the browser
 * suite reuses the server you already have running instead of starting a
 * second one somewhere else.
 *
 * Ranges, so a new module has an obvious slot:
 *
 *   5170–5189   web-fundamentals and the learning/ modules
 *   5190–5199   the framework modules, which run their own server
 *   5200–5219   projects/
 */
export const PORTS = {
  "web-fundamentals": 5170,

  "react-core": 5171,
  "typescript-react": 5172,
  styling: 5173,
  routing: 5174,
  "data-fetching": 5175,
  "state-management": 5176,
  forms: 5177,
  testing: 5178,
  accessibility: 5179,
  performance: 5180,
  "rendering-strategies": 5181,
  production: 5182,

  "next-app-router": 5190,
  "astro-islands": 5191,

  "bookmark-manager": 5200,
  dashboard: 5210,
  "next-storefront": 5220,
} as const satisfies Record<string, number>;

export type WorkspaceName = keyof typeof PORTS;

export function portFor(name: WorkspaceName): number {
  return PORTS[name];
}
