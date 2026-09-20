import { useId, useRef, useState } from "react";

import { CHANNELS, type Channel, type DayPoint } from "../data/series";
import {
  formatCompact,
  formatFull,
  indexAtX,
  linePath,
  niceExtent,
  ticks,
  xAt,
  yAt,
  type Plot,
} from "./scale";
import { MARKS, SERIES_LABEL, SERIES_VAR } from "./theme";

const PLOT: Plot = {
  width: 720,
  height: 280,
  // Room on the right for the direct end labels, which come before
  // gridlines and long before a second axis.
  padding: { top: 16, right: 88, bottom: 28, left: 48 },
};

export type TrafficChartProps = {
  points: DayPoint[];
  hidden: Set<Channel>;
  onToggle: (channel: Channel) => void;
};

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function TrafficChart({ points, hidden, onToggle }: TrafficChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const descId = useId();

  const visible = CHANNELS.filter((channel) => !hidden.has(channel));

  // The scale is computed from *all* series, not just the visible ones, so
  // hiding one does not rescale the chart under the reader.
  const extent = niceExtent(points.flatMap((point) => CHANNELS.map((channel) => point[channel])));
  const axisTicks = ticks(extent);

  function pointerIndex(event: React.PointerEvent<SVGSVGElement>): number | null {
    const svg = svgRef.current;
    if (svg === null || points.length === 0) return null;

    const box = svg.getBoundingClientRect();
    // The SVG scales to its container, so a client x has to be mapped back
    // into the viewBox before it means anything.
    const x = ((event.clientX - box.left) / box.width) * PLOT.width;

    return indexAtX(x, points.length, PLOT);
  }

  const active = activeIndex === null ? null : points[activeIndex];

  return (
    <figure className="m-0">
      <figcaption className="sr-only" id={descId}>
        Daily page views by channel over the selected period, as three lines on one scale.
      </figcaption>

      {/* The legend is always present for two or more series, so identity is
          never colour alone. Each entry is also a button that hides its
          series, which is why they are buttons rather than swatches. */}
      <ul className="mb-3 flex flex-wrap gap-3" data-testid="legend">
        {CHANNELS.map((channel) => {
          const isHidden = hidden.has(channel);

          return (
            <li key={channel}>
              <button
                type="button"
                aria-pressed={!isHidden}
                onClick={() => onToggle(channel)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
                style={{ opacity: isHidden ? 0.45 : 1 }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: SERIES_VAR[channel] }}
                />
                {/* Text in an ink token, never the series colour. The swatch
                    beside it carries the identity. */}
                <span style={{ color: "var(--text-primary)" }}>{SERIES_LABEL[channel]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${PLOT.width} ${PLOT.height}`}
        className="w-full"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        data-testid="chart"
        onPointerMove={(event) => setActiveIndex(pointerIndex(event))}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <title id={titleId}>Page views by channel</title>

        {/* Gridlines: hairline, solid, one step off the surface. Dashed grid
            competes with the data for attention. */}
        {axisTicks.map((tick) => {
          const y = yAt(tick, extent, PLOT);

          return (
            <g key={tick}>
              <line
                x1={PLOT.padding.left}
                x2={PLOT.width - PLOT.padding.right}
                y1={y}
                y2={y}
                stroke="var(--grid)"
                strokeWidth={MARKS.gridWidth}
              />
              <text
                data-testid="axis-label"
                x={PLOT.padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                className="tabular"
                fill="var(--text-secondary)"
              >
                {formatCompact(tick)}
              </text>
            </g>
          );
        })}

        {/* First and last date only: a tick per day is unreadable and a
            label on every point is the most common chart mistake. */}
        {points.length > 0 && (
          <>
            <text
              x={PLOT.padding.left}
              y={PLOT.height - 8}
              fontSize="11"
              fill="var(--text-secondary)"
            >
              {shortDate(points[0]!.date)}
            </text>
            <text
              x={PLOT.width - PLOT.padding.right}
              y={PLOT.height - 8}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-secondary)"
            >
              {shortDate(points.at(-1)!.date)}
            </text>
          </>
        )}

        {activeIndex !== null && (
          <line
            data-testid="crosshair"
            x1={xAt(activeIndex, points.length, PLOT)}
            x2={xAt(activeIndex, points.length, PLOT)}
            y1={PLOT.padding.top}
            y2={PLOT.height - PLOT.padding.bottom}
            stroke="var(--text-secondary)"
            strokeWidth={1}
          />
        )}

        {visible.map((channel) => (
          <path
            key={channel}
            data-testid={`line-${channel}`}
            d={linePath(
              points.map((point) => point[channel]),
              extent,
              PLOT,
            )}
            fill="none"
            stroke={SERIES_VAR[channel]}
            strokeWidth={MARKS.lineWidth}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Direct end labels, one per series. Required relief for the light
            aqua's sub-3:1 contrast, and better than a legend lookup anyway. */}
        {visible.map((channel) => {
          const last = points.at(-1);
          if (last === undefined) return null;

          return (
            <text
              key={channel}
              data-testid={`end-label-${channel}`}
              x={PLOT.width - PLOT.padding.right + 10}
              y={yAt(last[channel], extent, PLOT) + 4}
              fontSize="11"
              fill="var(--text-primary)"
            >
              {SERIES_LABEL[channel]} {formatCompact(last[channel])}
            </text>
          );
        })}

        {/* Markers only on the hovered point: a dot on every day is noise. */}
        {active !== null &&
          visible.map((channel) => (
            <circle
              key={channel}
              cx={xAt(activeIndex!, points.length, PLOT)}
              cy={yAt(active[channel], extent, PLOT)}
              r={MARKS.markerRadius}
              fill={SERIES_VAR[channel]}
              stroke="var(--surface-1)"
              strokeWidth={MARKS.markerRing}
            />
          ))}
      </svg>

      {/* The tooltip is HTML, not SVG: it can wrap, it can use tabular
          figures, and a screen reader can read it. */}
      <div
        role="status"
        aria-live="polite"
        data-testid="tooltip"
        className="mt-2 min-h-12 rounded-lg px-3 py-2 text-sm"
        style={{ background: "var(--surface-2)" }}
      >
        {active === null ? (
          <span style={{ color: "var(--text-secondary)" }}>
            Hover the chart for a day&rsquo;s numbers.
          </span>
        ) : (
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <strong>{shortDate(active.date)}</strong>
            {visible.map((channel) => (
              <span key={channel} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: SERIES_VAR[channel] }}
                />
                {SERIES_LABEL[channel]}{" "}
                <span className="tabular">{formatFull(active[channel])}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    </figure>
  );
}
