import { useMemo, useState } from "react";

import { ChartTable } from "./chart/ChartTable";
import { TrafficChart } from "./chart/TrafficChart";
import { formatCompact } from "./chart/scale";
import { StatTile } from "./components/StatTile";
import {
  SERIES,
  bestDay,
  changeVsPreviousPeriod,
  grandTotal,
  withinRange,
  type Channel,
  type RangeKey,
} from "./data/series";
import { EventTable } from "./table/EventTable";
import { EVENTS, filterRows, sortRows, type Outcome, type Sort } from "./table/events";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
];

export function App() {
  const [range, setRange] = useState<RangeKey>("30");
  const [hidden, setHidden] = useState<Set<Channel>>(new Set());
  const [showTable, setShowTable] = useState(false);

  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome | "all">("all");
  const [sort, setSort] = useState<Sort>({ key: "at", direction: "desc" });

  const points = useMemo(() => withinRange(SERIES, range), [range]);
  const best = useMemo(() => bestDay(points), [points]);
  const change = useMemo(() => changeVsPreviousPeriod(SERIES, range), [range]);

  // Ten thousand rows sorted and filtered on every keystroke would be the
  // one genuinely expensive thing on this page, so it is memoised on its
  // real inputs. Measured before memoising, not assumed: see the README.
  const rows = useMemo(
    () => sortRows(filterRows(EVENTS, query, outcome), sort),
    [query, outcome, sort],
  );

  function toggleChannel(channel: Channel): void {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });
  }

  return (
    <div className="viz-root min-h-dvh">
      <a className="skip-link" href="#main">
        Skip to the content
      </a>

      <header
        className="px-4 py-4"
        style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--grid)" }}
      >
        <div className="mx-auto max-w-5xl">
          <h1 className="text-xl font-semibold">Traffic</h1>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Filters in one row above the charts, which is where people look
            for them. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Date range">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              aria-pressed={range === option.key}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{
                background: range === option.key ? "var(--accent)" : "var(--surface-1)",
                color: range === option.key ? "var(--accent-ink)" : "var(--text-primary)",
                border: "1px solid var(--grid)",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <section aria-label="Headline numbers" className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Page views"
            value={grandTotal(points)}
            delta={change}
            deltaLabel={`vs the previous ${range} days`}
            hero
          />
          <StatTile
            label="Best day"
            value={best === null ? "—" : formatCompact(best.value)}
            deltaLabel={best?.date}
          />
          <StatTile label="Events recorded" value={EVENTS.length} />
        </section>

        <section
          aria-label="Page views by channel"
          className="rounded-xl p-4"
          style={{ background: "var(--surface-1)", border: "1px solid var(--grid)" }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Page views by channel</h2>
            <button
              type="button"
              onClick={() => setShowTable((current) => !current)}
              aria-pressed={showTable}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ border: "1px solid var(--grid)" }}
            >
              {showTable ? "Show the chart" : "Show the table"}
            </button>
          </div>

          {showTable ? (
            <ChartTable points={points} />
          ) : (
            <TrafficChart points={points} hidden={hidden} onToggle={toggleChannel} />
          )}
        </section>

        <section aria-label="Recent events" className="space-y-3">
          <h2 className="text-lg font-semibold">Recent events</h2>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              Filter
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="path or channel"
                className="rounded-lg px-3 py-1.5"
                style={{ background: "var(--surface-1)", border: "1px solid var(--grid)" }}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              Outcome
              <select
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as Outcome | "all")}
                className="rounded-lg px-3 py-1.5"
                style={{ background: "var(--surface-1)", border: "1px solid var(--grid)" }}
              >
                <option value="all">all</option>
                <option value="ok">ok</option>
                <option value="slow">slow</option>
                <option value="error">error</option>
              </select>
            </label>
          </div>

          <EventTable rows={rows} sort={sort} onSortChange={setSort} />
        </section>
      </main>
    </div>
  );
}
