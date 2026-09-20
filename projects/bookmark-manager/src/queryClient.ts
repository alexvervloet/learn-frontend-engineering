import { QueryClient } from "@tanstack/react-query";

/**
 * A factory, not a singleton.
 *
 * A module-level `new QueryClient()` is shared by every test in a run, so
 * one test's cached list satisfies the next test's query and the failure
 * only appears when the file order changes. The app calls this once; each
 * test calls it for itself.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying is right for a flaky network and wrong for a 404 or a
        // 401, which will never succeed however many times you ask.
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          if (status !== undefined && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
    },
  });
}
