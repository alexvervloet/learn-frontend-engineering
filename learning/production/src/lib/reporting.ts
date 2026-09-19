/**
 * Error reporting: what to catch, and what to strip before sending it.
 *
 * The shape here matches Sentry's, because it is the one most people meet,
 * but nothing depends on Sentry. The interesting parts are which errors an
 * error boundary does *not* catch, and the scrubbing, which is the thing that
 * keeps a crash report from becoming a data-protection incident.
 */
export type ReportedEvent = {
  message: string;
  release: string;
  user?: { id: string; email?: string };
  extra?: Record<string, unknown>;
  breadcrumbs?: { message: string }[];
};

/** Keys whose values never leave the browser, whatever they contain. */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "creditcard",
  "cardnumber",
  "cvv",
  "ssn",
];

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const BEARER = /\bBearer\s+[\w.\-~+/]+=*/gi;
const LONG_TOKEN = /\b(?:eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,})\b/g;
const CARD = /\b(?:\d[ -]*?){13,16}\b/g;

function scrubString(value: string): string {
  return value
    .replace(BEARER, "Bearer [redacted]")
    .replace(LONG_TOKEN, "[redacted-jwt]")
    .replace(CARD, "[redacted-card]")
    .replace(EMAIL, "[redacted-email]");
}

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.some((word) => key.toLowerCase().includes(word))) return "[redacted]";
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((item, index) => scrubValue(String(index), item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, scrubValue(k, v)]),
    );
  }
  return value;
}

/**
 * Runs over every event before it is sent. Sentry calls this hook
 * `beforeSend`, and having one is the difference between a crash report and a
 * copy of your users' data on someone else's server.
 *
 * The user id stays: without it you cannot tell one user hitting an error a
 * thousand times from a thousand users hitting it once, and those need
 * different responses. The email does not.
 */
export function scrubEvent(event: ReportedEvent): ReportedEvent {
  const scrubbed: ReportedEvent = {
    message: scrubString(event.message),
    release: event.release,
  };

  if (event.user !== undefined) {
    // id yes, email no.
    scrubbed.user = { id: event.user.id };
  }
  if (event.extra !== undefined) {
    scrubbed.extra = scrubValue("extra", event.extra) as Record<string, unknown>;
  }
  if (event.breadcrumbs !== undefined) {
    scrubbed.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      message: scrubString(crumb.message),
    }));
  }

  return scrubbed;
}

export type Caught = {
  source: "boundary" | "window.onerror" | "unhandledrejection";
  message: string;
};

/**
 * What catches what. An error boundary is not a global handler, and assuming
 * it is leaves most errors unreported.
 */
export const COVERAGE = [
  { kind: "Error thrown while rendering", caughtBy: "boundary" },
  { kind: "Error thrown in a click handler", caughtBy: "window.onerror" },
  { kind: "Rejected promise with no catch", caughtBy: "unhandledrejection" },
  { kind: "Error thrown in setTimeout", caughtBy: "window.onerror" },
  { kind: "Error thrown during a server render", caughtBy: "your server's logger" },
] as const;
