/**
 * Feature flags, and the two properties that make them safe.
 *
 * **Deterministic bucketing.** The same user must get the same answer every
 * time, on every device, without a round trip. `Math.random() < 0.1` gives a
 * user a different experience on each page load, which is unusable and makes
 * any measurement meaningless. Hashing `flag + userId` into a number and
 * comparing it to the rollout percentage gives a stable answer with no state.
 *
 * **A safe default.** The flag service will be slow, or down, or blocked by
 * an ad blocker. What the app does then is a decision, and it should be an
 * explicit one: a kill switch defaults to *on* (the feature works), a risky
 * new path defaults to *off*.
 */
export type Flag = {
  key: string;
  /** 0 to 100. */
  rollout: number;
  /** What to use when the flag service cannot be reached. */
  fallback: boolean;
};

/**
 * A 32-bit FNV-1a hash. Not cryptographic, and it does not need to be: it
 * needs to be fast, stable across runs and machines, and evenly distributed.
 */
export function hash(value: string): number {
  let result = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}

/** A stable 0-99 bucket for this user and this flag. */
export function bucket(flagKey: string, userId: string): number {
  // The flag key is in the hash so that a user in the unlucky 10% for one
  // flag is not automatically in it for every flag. Without that, the same
  // small group gets every half-finished feature.
  return hash(`${flagKey}:${userId}`) % 100;
}

export function isEnabled(flag: Flag, userId: string): boolean {
  if (flag.rollout <= 0) return false;
  if (flag.rollout >= 100) return true;

  return bucket(flag.key, userId) < flag.rollout;
}

export type FlagSource = { load: () => Promise<Record<string, number>> };

/**
 * Resolves every flag, falling back per flag if the source fails. Note it
 * does not throw: a flag service being down is an expected condition, not an
 * exception.
 */
export async function resolveFlags(
  flags: Flag[],
  userId: string,
  source: FlagSource,
): Promise<Record<string, boolean>> {
  let remote: Record<string, number> = {};
  let failed = false;

  try {
    remote = await source.load();
  } catch {
    failed = true;
  }

  return Object.fromEntries(
    flags.map((flag) => {
      if (failed) return [flag.key, flag.fallback];

      const rollout = remote[flag.key];
      // A flag the service does not know about is also a failure, and it is
      // the common one: someone removed it from the dashboard.
      if (typeof rollout !== "number") return [flag.key, flag.fallback];

      return [flag.key, isEnabled({ ...flag, rollout }, userId)];
    }),
  );
}
