import { LessonShell, defineLessons } from "@lab/lesson-shell";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { FetchInAnEffect } from "./lessons/01_fetch_in_an_effect";
import { KeysAndStaleness } from "./lessons/02_keys_and_staleness";
import { Mutations } from "./lessons/03_mutations";
import { Optimistic } from "./lessons/04_optimistic";
import { Infinite } from "./lessons/05_infinite";

// One client for the whole app, created outside the component. Creating it
// inside would build a new cache on every render, which is a cache that never
// hits.
const queryClient = new QueryClient();

const lessons = defineLessons([
  {
    id: "01-fetch-in-an-effect",
    group: "Why a library",
    title: "Fetching in an effect",
    summary: "The careful hand-rolled version, side by side with useQuery, counting requests.",
    file: "src/lessons/01_fetch_in_an_effect.tsx",
    Component: FetchInAnEffect,
  },
  {
    id: "02-keys-and-staleness",
    group: "Queries",
    title: "Keys, staleTime, gcTime",
    summary:
      "The key is the cache. staleTime is how long you trust it; gcTime is how long you keep it.",
    file: "src/lessons/02_keys_and_staleness.tsx",
    Component: KeysAndStaleness,
  },
  {
    id: "03-mutations",
    group: "Writes",
    title: "Mutations and invalidation",
    summary: "A write marks keys stale by prefix, and the queries on screen refetch themselves.",
    file: "src/lessons/03_mutations.tsx",
    Component: Mutations,
  },
  {
    id: "04-optimistic",
    group: "Writes",
    title: "Optimistic updates",
    summary: "Cancel, snapshot, guess, and put the snapshot back if the server disagrees.",
    file: "src/lessons/04_optimistic.tsx",
    Component: Optimistic,
  },
  {
    id: "05-infinite",
    group: "Queries",
    title: "Infinite lists",
    summary: "Pages instead of one answer, and the server deciding where the list ends.",
    file: "src/lessons/05_infinite.tsx",
    Component: Infinite,
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LessonShell
        title="Data fetching"
        subtitle="TanStack Query, caching, mutations, and a mock network"
        lessons={lessons}
      />
      {/* Worth opening. It shows every cache entry, its key, whether it is
          stale, and who is subscribed to it, which turns "why did that
          refetch" from guesswork into reading. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
