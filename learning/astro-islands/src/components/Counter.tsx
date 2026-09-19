import { useState } from "react";

/**
 * An ordinary React component. Nothing here knows about Astro.
 *
 * Whether it ships to the browser at all is decided at the *use site*, by the
 * `client:*` directive on the tag. The same file can be rendered to static
 * HTML on one page and hydrated on another.
 */
export function Counter({ label, testId }: { label: string; testId: string }) {
  const [count, setCount] = useState(0);

  return (
    <div className="row card" data-testid={testId}>
      <strong>{label}</strong>
      <button onClick={() => setCount((current) => current - 1)} aria-label={`${label} minus`}>
        −
      </button>
      <span data-testid={`${testId}-value`}>{count}</span>
      <button onClick={() => setCount((current) => current + 1)} aria-label={`${label} plus`}>
        +
      </button>
    </div>
  );
}
