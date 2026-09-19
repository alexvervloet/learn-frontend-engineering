// Pretends to be a charting library: a few hundred lines of lookup table that
// nobody should download unless they open the chart. Imported only through
// `lazy()` in lesson 05, so Vite emits it as its own chunk.
const POINTS = Array.from({ length: 64 }, (_, index) => ({
  x: index,
  y: Math.round((Math.sin(index / 4) * 0.5 + 0.5) * 100),
}));

export default function HeavyChart() {
  const width = 480;
  const height = 120;
  const path = POINTS.map(
    (point, index) =>
      `${index === 0 ? "M" : "L"} ${(point.x / (POINTS.length - 1)) * width} ${height - (point.y / 100) * height}`,
  ).join(" ");

  return (
    <figure style={{ margin: 0 }} data-testid="chart">
      <svg width={width} height={height} role="img" aria-label="A sine wave, as a line chart">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
      </svg>
      <figcaption className="note">
        This arrived in its own chunk, on the click. It is not in the initial bundle.
      </figcaption>
    </figure>
  );
}
