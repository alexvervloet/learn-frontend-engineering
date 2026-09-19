import { useRef } from "react";

/**
 * Counts renders. The controlled-versus-uncontrolled lesson is entirely about
 * this number, and it is invisible without a counter.
 *
 * Mutating a ref during render is what React asks you not to do, hence the
 * disabled rule. It is an instrument, not a pattern. StrictMode doubles these
 * in the browser; the tests run without it.
 */
export function useRenderCount(): number {
  const count = useRef(0);
  /* eslint-disable react-hooks/refs */
  count.current += 1;
  return count.current;
  /* eslint-enable react-hooks/refs */
}
