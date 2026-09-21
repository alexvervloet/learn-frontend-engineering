/**
 * Vitest browser mode, and the gap it closes
 * ==========================================
 * Every module in this repo has a section saying which of its claims jsdom
 * cannot check, and then hands those to Playwright. That works and it is
 * lopsided: Playwright drives a whole application through a URL, and most of
 * what jsdom gets wrong is one component's arithmetic about its own size.
 *
 * Browser mode is Vitest running your test file *in a real browser* instead of
 * in jsdom. Same `describe`, same `expect`, same Testing Library queries. What
 * changes is that `getBoundingClientRect` returns real numbers, `@container`
 * and `@layer` work, `:focus-visible` matches when it should, and an animation
 * actually runs.
 *
 *   vitest --browser.enabled --browser.name=chromium
 *
 * **It is not a replacement for Playwright.** The two answer different
 * questions:
 *
 *   browser mode   one component, mounted directly, in a real engine. Fast to
 *                  write, no server, no routing, no navigation.
 *   Playwright     the built application, over HTTP, through a URL, with the
 *                  service worker and the router and the real bundle.
 *
 * A rule that holds up: if the test would mount a component and assert
 * something about pixels, use browser mode. If it would visit a page, use
 * Playwright.
 *
 * **What it costs.** A browser has to start, so a suite that took 900ms in
 * jsdom takes several seconds. Each file gets an iframe rather than a fresh
 * module registry, so global state leaks between files more readily than it
 * does under jsdom's isolation. And it needs the browsers installed, which is
 * why this is a separate config and a separate script rather than something
 * `npm test` does.
 *
 * **The component below is the demonstration.** It measures its own width and
 * picks a column count. In jsdom every element is 0×0, so it always reports
 * one column, and a jsdom test can only assert the fallback. The same file
 * under browser mode measures a real box and gets a real answer.
 *
 * That is not a contrived example. It is the same failure the performance
 * module hits with TanStack Virtual, where the virtualizer measures a scroll
 * container, finds nothing visible, and renders no rows at all while the test
 * suite reports success.
 */
import { useEffect, useRef, useState } from "react";

/** Breakpoints in pixels, smallest first. The widest match wins. */
const BREAKPOINTS = [
  { minWidth: 0, columns: 1 },
  { minWidth: 400, columns: 2 },
  { minWidth: 800, columns: 3 },
  { minWidth: 1200, columns: 4 },
] as const;

/**
 * Pure, so the arithmetic is testable without a browser at all.
 *
 * Worth separating even when browser mode exists: a test that needs a browser
 * to check a comparison operator is a slow test for no reason.
 */
export function columnsFor(width: number): number {
  let columns = 1;
  for (const stop of BREAKPOINTS) {
    if (width >= stop.minWidth) columns = stop.columns;
  }
  return columns;
}

export function MeasuredColumns({ items = 8 }: { items?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    const measure = (): void => {
      setWidth(element.getBoundingClientRect().width);
    };
    measure();

    // The repo-wide jsdom setup stubs ResizeObserver with a no-op, so this
    // never fires under jsdom and `width` stays at whatever the first
    // measurement said, which is 0. Under browser mode it is a real one.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const columns = columnsFor(width);

  return (
    <div ref={ref} data-testid="grid-host" style={{ width: "100%" }}>
      <p className="note">
        measured width: <strong data-testid="measured-width">{Math.round(width)}</strong>px ·
        columns: <strong data-testid="column-count">{columns}</strong>
      </p>

      <div
        data-testid="grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
          gap: "0.5rem",
        }}
      >
        {Array.from({ length: items }, (_, index) => (
          <div
            key={index}
            data-testid="cell"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.375rem",
              padding: "0.5rem",
            }}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrowserMode() {
  return (
    <div className="stack">
      <p className="note">
        This component measures itself. In jsdom the measurement is 0 and it always says one column,
        so a jsdom test can assert the fallback and nothing else. Run{" "}
        <code>npm run test:browser -w learning/testing</code> to see the same test file get a real
        number.
      </p>

      <MeasuredColumns />

      <p className="note">
        Resize the window. The column count follows, because a real <code>ResizeObserver</code> is
        firing. The repo-wide jsdom setup stubs that with a no-op on purpose: a fake that reported
        plausible sizes would let a test assert something no browser would ever do.
      </p>
    </div>
  );
}
