// Imported only by `lazy()` in lesson 11, so Vite gives it a chunk of its own
// and the browser never downloads it unless someone opens the panel. Check the
// network tab: the request happens on the click, not on page load.
export default function HeavyPanel() {
  return (
    <div className="stack">
      <p>This component arrived in its own JavaScript chunk, requested when you clicked.</p>
      <p className="note">
        Real code splitting is per route, not per panel. The routing module does that.
      </p>
    </div>
  );
}
