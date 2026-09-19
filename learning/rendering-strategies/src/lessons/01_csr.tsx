/**
 * Client-side rendering, and what it costs
 * ========================================
 * A Vite SPA ships this:
 *
 *   <div id="root"></div>
 *   <script type="module" src="/index.js"></script>
 *
 * That is the entire document. Everything a user sees has to wait for the
 * JavaScript to download, parse, execute and render. The order is fixed and
 * nothing overlaps:
 *
 *   HTML → JS download → parse & execute → first render → data fetch → content
 *
 * Four consequences worth being clear about.
 *
 * **Time to content is bounded by your bundle.** On a fast laptop this is
 * imperceptible. On a mid-range Android on 4G, 300KB of JavaScript is a second
 * of parsing before anything is painted, and the parse is often worse than
 * the download.
 *
 * **Data fetching is a second waterfall after the first.** The component
 * cannot ask for data until it has rendered, and it cannot render until the
 * bundle has run. Server rendering collapses the first; route loaders collapse
 * the second.
 *
 * **Anything that does not run JavaScript sees an empty page.** Some crawlers
 * execute scripts, many link preview generators do not, and neither does a
 * browser where the bundle failed to load.
 *
 * **It is still the right answer for a large class of apps.** An internal
 * dashboard behind a login, an editor, anything where the first paint is a
 * spinner behind an auth check: there is no SEO to lose and no anonymous
 * first impression to make. CSR is simpler to build, simpler to deploy, and
 * cheaper to run than any of the alternatives. Reach past it when the first
 * visit to a public page is the thing that matters.
 *
 * This lesson is the one you are reading it in: view source on this page and
 * `#root` is empty.
 */
import { useEffect, useState } from "react";

export type Phase = { name: string; at: number };

/** Records when each stage of a client-rendered page actually happened. */
export function measurePhases(): Phase[] {
  const navigationStart = performance.timeOrigin;
  const entries: Phase[] = [{ name: "navigation", at: 0 }];

  const [navigation] = performance.getEntriesByType("navigation");
  if (navigation !== undefined) {
    entries.push({
      name: "HTML parsed",
      at: (navigation as PerformanceNavigationTiming).domInteractive,
    });
  }

  entries.push({ name: "React rendered", at: performance.now() });
  void navigationStart;

  return entries;
}

export function Csr() {
  const [phases, setPhases] = useState<Phase[]>([]);

  useEffect(() => {
    // One of the few legitimate uses of setState in an effect: the numbers do
    // not exist until after the commit, because measuring the render before it
    // has happened is not a thing. The data-fetching module is about the cases
    // where this rule is telling you something.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhases(measurePhases());
  }, []);

  return (
    <div className="stack">
      <h3>What the server sent</h3>
      <pre className="log">{`<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>`}</pre>
      <p className="note">
        That is the whole document for this page. Use View Source, not the elements panel: the
        elements panel shows the tree after React built it.
      </p>

      <h3>When things happened on this visit</h3>
      <ul data-testid="phases">
        {phases.length === 0 && <li className="note">measuring…</li>}
        {phases.map((phase) => (
          <li key={phase.name}>
            {phase.name}: {Math.round(phase.at)}ms
          </li>
        ))}
      </ul>

      <h3>When to stay here</h3>
      <ul>
        <li>Everything is behind a login, so there is no anonymous first paint.</li>
        <li>No SEO to lose: a dashboard, an editor, an admin tool.</li>
        <li>You want one deployable static bundle and no server at request time.</li>
      </ul>
    </div>
  );
}
