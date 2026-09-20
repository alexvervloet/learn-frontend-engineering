export default function NotFound() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">No such product</h1>
      <p className="mt-2" style={{ color: "var(--ink-soft)" }}>
        It may have sold out for good. <a href="/products">Everything else</a> is still here.
      </p>
    </div>
  );
}
