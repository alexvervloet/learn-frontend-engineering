/**
 * Core Web Vitals
 * ===============
 * Three metrics, each measuring a different kind of "this feels bad", and each
 * with thresholds Google publishes and search ranking uses.
 *
 *   LCP  Largest Contentful Paint. When the main thing appeared.
 *        good ≤ 2.5s, poor > 4s
 *   INP  Interaction to Next Paint. The worst delay between a click or tap and
 *        the screen changing, across the whole visit.
 *        good ≤ 200ms, poor > 500ms
 *   CLS  Cumulative Layout Shift. How much content moved without the user
 *        asking. Unitless.
 *        good ≤ 0.1, poor > 0.25
 *
 * The number that counts is the **75th percentile of real users**, not your
 * laptop. Lighthouse on a fast machine on a fast connection is a debugging
 * tool; the field data is the score. `web-vitals` reports the real thing from
 * real sessions, which is why production sends it somewhere:
 *
 *   onLCP(send); onINP(send); onCLS(send);
 *
 * **What moves each one.**
 *
 * LCP is nearly always an image or a web font. Preload the hero image, serve
 * it at the size it renders, use `fetchpriority="high"` on it and `loading="lazy"`
 * on everything below the fold. A client-rendered SPA has a structural problem
 * here: the browser cannot paint the main content until the JavaScript has
 * downloaded, parsed and run, which is most of the argument for server
 * rendering.
 *
 * INP is main-thread work during an interaction. This is where React's
 * transitions earn their place: `useTransition` lets the urgent update paint
 * while the expensive one is interrupted. A 300ms synchronous filter on every
 * keystroke is an INP failure that no amount of `memo` fixes.
 *
 * CLS is almost entirely **unreserved space**. An image with no dimensions, an
 * ad slot, a font swap, a banner injected at the top after load. The fix is
 * boring and complete: give everything its size in advance.
 *
 *   <img src="…" width={800} height={450} />        the attributes, not CSS
 *   .hero { aspect-ratio: 16 / 9; }                 for a responsive one
 *   font-display: optional                          no swap, no reflow
 *
 * `rating` below is the official bucketing, written out. It is the one part of
 * this that a test without a browser can check, and it is worth having in code
 * anyway: sending raw numbers to a dashboard and eyeballing them is how a
 * regression sits unnoticed for a quarter.
 */
import { useEffect, useState } from "react";

export type MetricName = "LCP" | "INP" | "CLS" | "FCP" | "TTFB";
export type Rating = "good" | "needs-improvement" | "poor";

/** Google's published thresholds. [good ceiling, needs-improvement ceiling]. */
export const THRESHOLDS: Record<MetricName, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

export function rating(name: MetricName, value: number): Rating {
  const [good, poor] = THRESHOLDS[name];

  // Inclusive at the good boundary: exactly 2500ms is still good.
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

const RATING_COLOUR: Record<Rating, string> = {
  good: "oklch(0.55 0.15 150)",
  "needs-improvement": "oklch(0.65 0.15 75)",
  poor: "var(--danger)",
};

type Reported = { name: string; value: number; rating: Rating };

export function WebVitals() {
  const [reported, setReported] = useState<Reported[]>([]);
  const [reserveSpace, setReserveSpace] = useState(true);
  const [showLate, setShowLate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Loaded lazily: it is a few kilobytes that only the real-user-monitoring
    // path needs, and lesson 05 is about not shipping what you do not use.
    void import("web-vitals").then(({ onCLS, onINP, onLCP }) => {
      const report = (metric: { name: string; value: number }) => {
        if (cancelled) return;
        setReported((current) => [
          ...current.filter((entry) => entry.name !== metric.name),
          {
            name: metric.name,
            value: metric.value,
            rating: rating(metric.name as MetricName, metric.value),
          },
        ]);
      };

      onLCP(report);
      onINP(report);
      onCLS(report);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="stack">
      <h3>What the thresholds are</h3>
      <table style={{ borderCollapse: "collapse" }} data-testid="thresholds">
        <thead>
          <tr>
            {["Metric", "Good", "Poor"].map((heading) => (
              <th key={heading} style={{ textAlign: "left", padding: "0.3rem 1rem 0.3rem 0" }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(Object.keys(THRESHOLDS) as MetricName[]).map((name) => (
            <tr key={name}>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>
                <code>{name}</code>
              </td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>≤ {THRESHOLDS[name][0]}</td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>&gt; {THRESHOLDS[name][1]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>What this page is scoring</h3>
      <ul data-testid="reported">
        {reported.length === 0 && <li className="note">nothing reported yet</li>}
        {reported.map((entry) => (
          <li key={entry.name} style={{ color: RATING_COLOUR[entry.rating] }}>
            {entry.name} {Math.round(entry.value * 100) / 100} · {entry.rating}
          </li>
        ))}
      </ul>

      <h3>Causing a layout shift on purpose</h3>
      <label className="row">
        <input
          type="checkbox"
          checked={reserveSpace}
          onChange={(event) => setReserveSpace(event.target.checked)}
        />
        Reserve space for the banner
      </label>
      <button onClick={() => setShowLate((current) => !current)}>
        {showLate ? "Remove" : "Insert"} a late banner
      </button>

      <div
        data-testid="reserved"
        // The entire fix for most CLS: say how big it will be before it exists.
        style={reserveSpace ? { minHeight: "3rem" } : undefined}
      >
        {showLate && (
          <p className="panel" style={{ margin: 0 }}>
            A banner that arrived after paint.
          </p>
        )}
      </div>

      <p>Content below the banner, which is what moves.</p>

      <p className="note">
        Untick the box and press insert: everything below jumps. Tick it and the space was already
        there. That is the difference between a CLS of 0.2 and a CLS of 0.
      </p>
    </div>
  );
}
