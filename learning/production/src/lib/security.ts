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

    // <object>, <embed> and <applet>. Nothing in a modern app uses them, and
    // a plugin document is another way to get script running on your origin.
    // It is one of the two directives Google's CSP Evaluator treats as
    // mandatory, alongside base-uri, and it is the one people leave out
    // because they have never needed the elements it blocks.
    "object-src": ["'none'"],

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
    // Both, and deliberately.
    //
    // `report-uri` is deprecated in CSP Level 3 and is still the only one some
    // browsers honour. `report-to` replaces it and names a group defined by a
    // separate `Reporting-Endpoints` response header, which is why it cannot
    // be expressed here on its own: this function returns directives, and that
    // header is not one. `reportingEndpointsHeader` below builds it.
    //
    // Send both until the old one is genuinely unused, because a policy whose
    // reports go nowhere is a policy you will never dare enforce.
    directives["report-uri"] = [options.reportUri];
    directives["report-to"] = [REPORT_GROUP];
  }

  return directives;
}

/** The group name tying `report-to` to the `Reporting-Endpoints` header. */
export const REPORT_GROUP = "csp";

/**
 * The companion header for `report-to`.
 *
 *   Reporting-Endpoints: csp="https://example.com/csp-reports"
 *
 * Without it, `report-to csp` names a group nothing has defined and the
 * reports are dropped silently, which looks exactly like having no
 * violations.
 */
export function reportingEndpointsHeader(reportUri: string): string {
  return `${REPORT_GROUP}="${reportUri}"`;
}

export function serialiseCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}
