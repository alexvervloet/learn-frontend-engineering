/**
 * A module with a side effect, so lesson 03 has something worth mocking. In a
 * real app this posts to a collector; here it just records calls.
 */
export type Event = { name: string; properties?: Record<string, unknown> };

const sent: Event[] = [];

export function track(name: string, properties?: Record<string, unknown>): void {
  sent.push({ name, ...(properties === undefined ? {} : { properties }) });
}

export function sentEvents(): readonly Event[] {
  return sent;
}

export function clearEvents(): void {
  sent.length = 0;
}
