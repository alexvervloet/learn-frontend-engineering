import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * A fresh QueryClient per test. Sharing one would let a cache entry written by
 * one test satisfy the next test's query, and the failure that produces only
 * appears when you run the file in a different order.
 *
 * `retry: false` matters just as much. The default of three retries with
 * exponential backoff is right in production and useless in a test: a test for
 * an error state would spend seconds retrying before the error ever renders.
 */
export function renderWithClient(ui: ReactElement): RenderResult & { client: QueryClient } {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const result = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...result, client };
}
