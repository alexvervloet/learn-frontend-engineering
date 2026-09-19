/**
 * Configuration, parsed once at the boundary.
 *
 * The rule that matters: **anything prefixed `VITE_` is inlined into the
 * bundle at build time.** Vite does a textual substitution, so
 * `import.meta.env.VITE_API_URL` becomes the literal string in the output. It
 * is not read at runtime, it is not secret, and it cannot be changed without
 * rebuilding. A `VITE_STRIPE_SECRET_KEY` is a secret published to every
 * visitor, and the naming convention is the only thing standing between you
 * and that.
 *
 * The corollary people miss: **the same build cannot be promoted between
 * environments.** If the API URL is baked in, the artefact you tested in
 * staging is not the artefact you ship to production. Two ways out:
 *
 *   build per environment    simple, and you test one artefact and ship another
 *   fetch config at runtime  one artefact everywhere, one extra request before
 *                            the app can start
 *
 * Neither is free. Build-per-environment is right for most teams; runtime
 * config earns its place when the same bundle goes to many tenants.
 *
 * `readConfig` parses rather than reads. A missing variable should fail at
 * startup with the name of the variable, not three screens later as
 * `fetch(undefined)`.
 */
export type Config = {
  apiUrl: string;
  sentryDsn: string | null;
  commitSha: string;
  environment: "development" | "production";
};

export type ConfigResult = { ok: true; config: Config } | { ok: false; problems: string[] };

/** The shape Vite's `import.meta.env` has, narrowed to what this app uses. */
export type RawEnv = Record<string, string | boolean | undefined>;

export function readConfig(env: RawEnv): ConfigResult {
  const problems: string[] = [];

  const apiUrl = typeof env["VITE_API_URL"] === "string" ? env["VITE_API_URL"] : "";
  if (apiUrl === "") {
    // Named, at startup. Not `fetch(undefined)` somewhere else.
    problems.push("VITE_API_URL is required");
  } else if (!/^https?:\/\//.test(apiUrl)) {
    problems.push("VITE_API_URL must be an absolute URL");
  }

  const sentryDsn = typeof env["VITE_SENTRY_DSN"] === "string" ? env["VITE_SENTRY_DSN"] : "";

  // Not required: an app should run without an error tracker. It should not
  // run without knowing where its API is.
  const commitSha = typeof env["VITE_COMMIT_SHA"] === "string" ? env["VITE_COMMIT_SHA"] : "unknown";

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    config: {
      apiUrl,
      sentryDsn: sentryDsn === "" ? null : sentryDsn,
      commitSha,
      environment: env["PROD"] === true ? "production" : "development",
    },
  };
}

/**
 * Names that must never be prefixed `VITE_`. Checked in CI by the test beside
 * the lesson: a list is a poor substitute for thinking, and it catches the
 * copy-paste that a code review does not.
 */
export const NEVER_PUBLIC = [
  "SECRET",
  "PRIVATE",
  "PASSWORD",
  "TOKEN",
  "CREDENTIAL",
  "SERVICE_ROLE",
];

export function findLeakedSecrets(env: RawEnv): string[] {
  return Object.keys(env).filter(
    (key) =>
      key.startsWith("VITE_") && NEVER_PUBLIC.some((word) => key.toUpperCase().includes(word)),
  );
}
