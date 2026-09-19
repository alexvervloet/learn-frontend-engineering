/**
 * Where a token can live in a browser, and what each place costs.
 *
 * There is no option that is safe against everything. The honest framing is
 * which attack each one is vulnerable to, and XSS is the one that matters
 * most because it defeats almost all of them.
 */
export type Storage = "memory" | "localStorage" | "sessionStorage" | "httpOnlyCookie";

export type Assessment = {
  storage: Storage;
  /** Can a script on your origin read it? This is the XSS question. */
  readableByScript: boolean;
  /** Does it survive a page reload? */
  survivesReload: boolean;
  /** Is it attached to requests automatically, and therefore a CSRF target? */
  sentAutomatically: boolean;
  note: string;
};

export const ASSESSMENTS: Assessment[] = [
  {
    storage: "memory",
    readableByScript: true,
    survivesReload: false,
    sentAutomatically: false,
    note: "Safest against a stolen-at-rest token, and the user is logged out on every reload unless you can silently refresh.",
  },
  {
    storage: "localStorage",
    readableByScript: true,
    survivesReload: true,
    sentAutomatically: false,
    note: "Any script on the origin can read it, including one injected by XSS or shipped in a compromised dependency.",
  },
  {
    storage: "sessionStorage",
    readableByScript: true,
    survivesReload: true,
    sentAutomatically: false,
    note: "Same exposure as localStorage, scoped to one tab. The scoping is a usability choice, not a security one.",
  },
  {
    storage: "httpOnlyCookie",
    readableByScript: false,
    survivesReload: true,
    sentAutomatically: true,
    note: "Invisible to JavaScript, so XSS cannot read it. Sent automatically, so it needs SameSite and CSRF protection.",
  },
];

export function assess(storage: Storage): Assessment {
  const found = ASSESSMENTS.find((entry) => entry.storage === storage);
  if (found === undefined) throw new Error(`unknown storage: ${storage}`);
  return found;
}

export type CookieOptions = {
  name: string;
  value: string;
  maxAgeSeconds: number;
  sameSite?: "Strict" | "Lax" | "None";
  secure?: boolean;
  httpOnly?: boolean;
  path?: string;
};

/**
 * Builds a Set-Cookie value. This runs on a *server*; it is here so the
 * attributes can be tested and explained, because getting them wrong is how a
 * session cookie ends up readable, or sent cross-site, or sent over http.
 */
export function setCookie(options: CookieOptions): string {
  const {
    name,
    value,
    maxAgeSeconds,
    sameSite = "Lax",
    secure = true,
    httpOnly = true,
    path = "/",
  } = options;

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
  ];

  // The one that makes XSS unable to read it. Without it, everything else
  // here is decoration.
  if (httpOnly) parts.push("HttpOnly");
  // Refuses to be sent over plain http.
  if (secure) parts.push("Secure");
  // Lax: not sent on cross-site POSTs, which is most of CSRF. Strict also
  // drops it on ordinary inbound links, which logs users out when they arrive
  // from an email.
  parts.push(`SameSite=${sameSite}`);

  return parts.join("; ");
}

export type CookieProblem = string;

/** The review you would want someone to do on a session cookie. */
export function auditCookie(header: string): CookieProblem[] {
  const problems: CookieProblem[] = [];
  const lower = header.toLowerCase();

  if (!lower.includes("httponly")) {
    problems.push("no HttpOnly: any script on the origin can read this");
  }
  if (!lower.includes("secure")) {
    problems.push("no Secure: this will be sent over plain http");
  }
  if (!lower.includes("samesite")) {
    problems.push("no SameSite: browsers default to Lax, but say it explicitly");
  }
  if (lower.includes("samesite=none") && !lower.includes("secure")) {
    problems.push("SameSite=None without Secure is rejected by browsers");
  }

  return problems;
}
