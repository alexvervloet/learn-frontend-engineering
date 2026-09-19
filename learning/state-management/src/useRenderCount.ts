import { useRef } from "react";

/**
 * Counts renders, so a lesson can show which components a store update woke up.
 * That is the whole subject of this module, and it is invisible without a
 * counter.
 *
 * Mutating a ref during render is exactly what React asks you not to do, which
 * is why the lint rule is off for two lines. It is a measuring instrument, not
 * a pattern. Under StrictMode these numbers double in development; the tests
 * run without it and see the real count.
 */
export function useRenderCount(): number {
  const count = useRef(0);
  /* eslint-disable react-hooks/refs */
  count.current += 1;
  return count.current;
  /* eslint-enable react-hooks/refs */
}
