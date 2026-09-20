import { render, type RenderResult } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import type { QueryClient } from "@tanstack/react-query";

import { Providers } from "./App";
import { makeQueryClient } from "./queryClient";
import { setAccessToken } from "./api/client";
import { routes } from "./routes";

/**
 * Renders the real route table over a memory router.
 *
 * `initialEntries` is the history stack, so a test starts on any page with no
 * mocking and no `window.location` manipulation, and `router.state.location`
 * is readable afterwards. The routes under test are the routes that ship:
 * they come from `src/routes.tsx`, which the app also uses.
 *
 * The sign-in gate is bypassed by setting the token the client would have
 * received, rather than by rendering a different tree. The API handlers check
 * for it, so the requests a test makes are the requests the app makes.
 */
export function renderApp(
  initialEntries: string[] = ["/bookmarks"],
  options: { signedIn?: boolean; queryClient?: QueryClient } = {},
): RenderResult & { router: ReturnType<typeof createMemoryRouter>; queryClient: QueryClient } {
  const { signedIn = true, queryClient = makeQueryClient() } = options;

  setAccessToken(signedIn ? "test-access-token" : null);

  const router = createMemoryRouter(routes, { initialEntries });

  const result = render(
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  );

  return { ...result, router, queryClient };
}

/** Retries off, so a test of an error state does not spend seconds retrying. */
export function testQueryClient(): QueryClient {
  const client = makeQueryClient();
  client.setDefaultOptions({
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  });
  return client;
}
