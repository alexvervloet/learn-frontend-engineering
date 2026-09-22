import { lesson as domAndEvents } from "./lessons/01_dom_and_events";
import { lesson as eventLoop } from "./lessons/02_event_loop";
import { lesson as fetchAndRaces } from "./lessons/03_fetch_and_races";
import { lesson as storage } from "./lessons/04_storage";
import { lesson as workers } from "./lessons/05_workers";
import type { Lesson } from "./types";

/** Sidebar order is this array's order. */
export const lessons: readonly Lesson[] = [
  domAndEvents,
  eventLoop,
  fetchAndRaces,
  storage,
  workers,
];
