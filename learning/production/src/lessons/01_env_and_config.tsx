/**
 * Environment configuration
 * =========================
 * **`VITE_` means public.** Vite substitutes `import.meta.env.VITE_X` with the
 * literal value at build time, so it is in the JavaScript every visitor
 * downloads. There is no runtime lookup and nothing secret about it. A
 * `VITE_DATABASE_PASSWORD` is a password published on your website.
 *
 * The prefix is the whole safety mechanism, which is why it is worth having a
 * CI check that no `VITE_`-prefixed name contains `SECRET`, `TOKEN`,
 * `PASSWORD` and friends. `findLeakedSecrets` in `src/lib/config.ts` is that
 * check, and the test beside this file runs it.
 *
 * **Build-time config means you cannot promote a build.** The artefact tested
 * in staging has the staging API URL compiled into it, so what ships to
 * production is a different artefact that nobody tested. Two ways out, both
 * with a cost:
 *
 *   build per environment   simple, familiar, and you ship an untested build
 *   fetch /config.json at   one artefact everywhere, and an extra request
 *   startup                 before the app can render anything
 *
 * Most teams should build per environment and know that they are doing it.
 * Runtime config earns its keep when one bundle serves many tenants.
 *
 * **Parse at startup, not at the point of use.** `readConfig` returns problems
 * with variable names in them. The alternative is `fetch(undefined)` in a
 * component three screens in, which reads as a network bug.
 *
 * **What is safe to expose**: an API base URL, a Sentry DSN (it is designed to
 * be public), a commit SHA, a feature-flag client key, a publishable payment
 * key. **What is not**: anything called a secret key, a service-role key, a
 * database URL, a signing secret. If in doubt, it belongs on a server that the
 * browser talks to.
 */
import { findLeakedSecrets, readConfig } from "../lib/config";

const SAMPLES: { label: string; env: Record<string, string | boolean> }[] = [
  {
    label: "A good one",
    env: { VITE_API_URL: "https://api.example.com", VITE_COMMIT_SHA: "a1b2c3d", PROD: true },
  },
  {
    label: "Missing the API URL",
    env: { VITE_COMMIT_SHA: "a1b2c3d" },
  },
  {
    label: "A relative URL, which will not work from another origin",
    env: { VITE_API_URL: "/api" },
  },
  {
    label: "A secret, published",
    env: { VITE_API_URL: "https://api.example.com", VITE_STRIPE_SECRET_KEY: "sk_live_oops" },
  },
];

export function EnvAndConfig() {
  return (
    <div className="stack">
      <h3>Parsing the environment</h3>

      {SAMPLES.map((sample) => {
        const result = readConfig(sample.env);
        const leaked = findLeakedSecrets(sample.env);

        return (
          <div key={sample.label} className="stack" data-testid={`sample-${sample.label}`}>
            <p>
              <strong>{sample.label}</strong>
            </p>
            <pre className="log">{JSON.stringify(sample.env, null, 2)}</pre>
            <p
              className={result.ok ? "note" : undefined}
              style={result.ok ? {} : { color: "var(--danger)" }}
            >
              {result.ok
                ? `ok · api ${result.config.apiUrl} · build ${result.config.commitSha}`
                : result.problems.join("; ")}
            </p>
            {leaked.length > 0 && (
              <p role="alert" style={{ color: "var(--danger)" }}>
                ✕ published to every visitor: {leaked.join(", ")}
              </p>
            )}
          </div>
        );
      })}

      <h3>This build</h3>
      <pre className="log" data-testid="this-build">
        {JSON.stringify(
          {
            MODE: import.meta.env.MODE,
            DEV: import.meta.env.DEV,
            PROD: import.meta.env.PROD,
          },
          null,
          2,
        )}
      </pre>

      <p className="note">
        Run <code>npm run build</code> and grep the output for any value you set. Everything
        prefixed <code>VITE_</code> is in there as a plain string.
      </p>
    </div>
  );
}
