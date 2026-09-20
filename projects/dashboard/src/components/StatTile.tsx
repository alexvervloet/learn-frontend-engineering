import { formatFull } from "../chart/scale";

/**
 * A stat tile, not a one-bar bar chart.
 *
 * The contract: a label in sentence case with no trailing colon, a value
 * large enough to be the thing you read first, and a delta that says what it
 * is measured against. A percentage with no baseline named is not
 * information.
 */
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  hero = false,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  deltaLabel?: string;
  hero?: boolean;
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const rising = hasDelta && delta > 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--surface-1)", border: "1px solid var(--grid)" }}
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p
        className={`tabular mt-1 font-semibold ${hero ? "text-5xl" : "text-2xl"}`}
        style={{ color: "var(--text-primary)" }}
      >
        {typeof value === "number" ? formatFull(value) : value}
      </p>
      {hasDelta && (
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {/* An arrow as well as a sign, because direction should not rest on
              a minus sign alone at small sizes. */}
          <span aria-hidden="true">{rising ? "↑" : "↓"}</span>{" "}
          <span className="tabular">
            {rising ? "+" : ""}
            {(delta * 100).toFixed(1)}%
          </span>{" "}
          {deltaLabel}
        </p>
      )}
    </div>
  );
}
