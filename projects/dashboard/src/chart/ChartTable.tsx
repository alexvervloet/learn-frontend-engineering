import { CHANNELS, type DayPoint } from "../data/series";
import { formatFull } from "./scale";
import { SERIES_LABEL } from "./theme";

/**
 * The chart's data as a table.
 *
 * Not an afterthought: the light-mode aqua sits below 3:1 against the
 * surface, and the method's relief rule says that obliges visible labels or
 * a table view. This is that table, and it is also simply the better way to
 * read an exact number off a chart.
 */
export function ChartTable({ points }: { points: DayPoint[] }) {
  return (
    // tabIndex and a label, because a box that scrolls has to be reachable
    // by keyboard. The event grid solves the same problem the other way, by
    // being focusable already and handling the keys itself; this one is a
    // plain table with nothing to handle, so the standard scrollable-region
    // pattern is right here.
    <div
      className="max-h-80 overflow-auto rounded-lg"
      style={{ border: "1px solid var(--grid)" }}
      tabIndex={0}
      role="region"
      aria-label="Page views by channel, by day"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Page views by channel, by day</caption>
        <thead className="sticky top-0" style={{ background: "var(--surface-2)" }}>
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Date
            </th>
            {CHANNELS.map((channel) => (
              <th key={channel} scope="col" className="px-3 py-2 text-right font-medium">
                {SERIES_LABEL[channel]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date} style={{ borderTop: "1px solid var(--grid)" }}>
              <th scope="row" className="px-3 py-1.5 text-left font-normal">
                {point.date}
              </th>
              {CHANNELS.map((channel) => (
                <td key={channel} className="tabular px-3 py-1.5 text-right">
                  {formatFull(point[channel])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
