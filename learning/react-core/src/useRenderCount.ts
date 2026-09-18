import { useRef } from "react";

/**
 * Counts how many times a component has rendered.
 *
 * This hook is a measuring instrument, not a pattern. Mutating a ref during
 * render is exactly the impurity React asks you to avoid, which is why the lint
 * rule below has to be switched off for one line. Do not copy it into an app.
 *
 * Under StrictMode, React renders every component twice in development to catch
 * components that are not pure, so in the browser these numbers are doubled.
 * Tests run without StrictMode and see the real count.
 */
export function useRenderCount(): number {
  const count = useRef(0);
  // react-hooks/refs is right and this hook is the exception that proves it:
  // measuring renders is the one job that needs a value React is not tracking.
  /* eslint-disable react-hooks/refs */
  count.current += 1;
  return count.current;
  /* eslint-enable react-hooks/refs */
}
