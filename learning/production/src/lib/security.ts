import DOMPurify from "dompurify";

/**
 * Sanitising, and describing a Content Security Policy.
 *
 * React escapes everything it renders as text, which is why XSS is rare in a
 * React app. There is exactly one way to opt out, and it is named so you
 * cannot do it by accident: `dangerouslySetInnerHTML`. Anywhere that appears,
 * the input has to be sanitised, on the server if possible and in the browser
 * if not.
 *
 * DOMPurify is the answer. Not a regular expression, not a list of banned
 * tags: browsers parse malformed HTML in ways that defeat every hand-rolled
 * filter that has ever been written.
 */
export function sanitise(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // An allow-list, not a block-list. A block-list is a list of the attacks
    // you have heard of.
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "ul", "ol", "li", "code"],
    ALLOWED_ATTR: ["href", "title"],
    // Stops javascript: and data: URLs on the anchors allowed above.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
}

export type CspDirectives = Record<string, string[]>;

/**
 * A starting policy. Every directive here is doing something, and the
 * comments say what, because a policy nobody understands gets loosened to
 * `unsafe-inline` the first time something breaks.
 */
export function baselineCsp(options: { apiUrl: string; reportUri?: string }): CspDirectives {
  const directives: CspDirectives = {
    // Nothing loads from anywhere unless a more specific directive allows it.
    "default-src": ["'self'"],

    // No 'unsafe-inline' and no 'unsafe-eval'. Those two together are most of
    // what a CSP is for, and adding them back to fix one inline handler
    // throws away the protection for the whole page.
    "script-src": ["'self'"],

    // Styles are the common compromise: many libraries inject a <style> tag.
    // 'unsafe-inline' for styles is a much smaller hole than for scripts, and
    // a nonce is better still where the build can supply one.
    "style-src": ["'self'", "'unsafe-inline'"],

    "img-src": ["'self'", "data:", "https:"],
    "font-src": ["'self'"],

    // Where the app is allowed to make requests. This is what turns a stolen
    // token into a token the attacker cannot exfiltrate from your page.
    "connect-src": ["'self'", options.apiUrl],

    // Nobody can frame this page: clickjacking, gone.
    "frame-ancestors": ["'none'"],

    // No <base> tag injection redirecting every relative URL.
    "base-uri": ["'self'"],

    // A form cannot be pointed at someone else's server.
    "form-action": ["'self'"],
  };

  if (options.reportUri !== undefined) {
    directives["report-uri"] = [options.reportUri];
  }

  return directives;
}

export function serialiseCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
