import { useRef } from "react";

/**
 * Counts renders. Every claim in this module is about how many times something
 * ran, and that is invisible without a counter.
 *
 * Mutating a ref during render is what React asks you not to do, hence the
 * disabled rule. Note that the React Compiler is on in this module and this
 * hook still works: the compiler memoises values, it does not stop a component
 * being called.
 */
export function useRenderCount(): number {
  const count = useRef(0);
  /* eslint-disable react-hooks/refs */
  count.current += 1;
  return count.current;
  /* eslint-enable react-hooks/refs */
}
