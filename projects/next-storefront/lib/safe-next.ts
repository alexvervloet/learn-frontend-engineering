/**
 * Where sign-in is allowed to send you afterwards.
 *
 * `next` arrives in the query string, so it is attacker-controlled. Redirect
 * to whatever turns up and you have an open redirect: a link on your own
 * domain that lands people somewhere else, moments after they typed their
 * credentials into a page that was genuinely yours.
 *
 * The obvious guard is a string test, and the obvious string test is wrong:
 *
 *     value.startsWith("/") && !value.startsWith("//")
 *
 * That rejects `https://evil.example` and `//evil.example`, and it accepts
 * `/\evil.example`, which every browser resolves to `https://evil.example/`.
 * Backslash is a path separator for special schemes, so `/\` is `//` by the
 * time the address bar sees it. Tab, newline and carriage return are stripped
 * before parsing, so `/<tab>/evil.example` gets there too.
 *
 * The lesson generalises past this one bug. A URL is not a string with rules,
 * it is a grammar, and any check that reads it as a string is guessing at
 * what the parser will do. So use the parser. Resolve the value against a
 * base nobody can be, and if the result did not stay on that base, it escaped.
 *
 * Two details worth copying:
 *
 *   The base is a sentinel, not this site's real origin. We do not know our
 *   own origin here without reading headers, and not knowing it is fine: an
 *   absolute URL is rejected even when it points back at us, which costs
 *   nothing and removes a whole class of "is this host really mine" bugs.
 *
 *   What comes back is the parser's own output, not the string that arrived.
 *   Validating one spelling and redirecting to another is how these get
 *   reopened later.
 */
const FALLBACK = "/orders";

/** A host the request can never legitimately be for. */
const SENTINEL = "https://next.invalid";

export function safeNext(value: string): string {
  let resolved: URL;

  try {
    resolved = new URL(value, SENTINEL);
  } catch {
    // `new URL` with a base throws only on a base it cannot parse, so this is
    // unreachable today. It stays because the alternative to a two-line catch
    // is a 500 on the sign-in path the first time that stops being true.
    return FALLBACK;
  }

  // Anything that reached another origin, or a scheme with no origin at all
  // such as `javascript:`, fails here.
  if (resolved.origin !== SENTINEL) return FALLBACK;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
