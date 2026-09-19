/**
 * XSS and Content Security Policy
 * ===============================
 * **React escapes text, so XSS in a React app is rare and specific.**
 * `{userInput}` is inserted as text, never parsed as HTML. The one way out is
 * named to be hard to do by accident:
 *
 *   <div dangerouslySetInnerHTML={{ __html: comment }} />
 *
 * Anywhere that appears, the input has to be sanitised. Use DOMPurify, and an
 * allow-list rather than a block-list: browsers parse malformed HTML in ways
 * that defeat every hand-written filter, and a block-list is a list of the
 * attacks you have heard of.
 *
 * **The other React-specific hole is a URL.** `<a href={userInput}>` accepts
 * `javascript:alert(1)`, and React does not stop you. Validate the scheme.
 * The same applies to `src`, to `window.open`, and to a router's redirect
 * parameter, which is how open-redirect bugs happen.
 *
 * **CSP is the second line, for when the first fails.** It tells the browser
 * where scripts may come from, so an injected `<script>` does not run even if
 * something got through. The two directives that matter most:
 *
 *   script-src 'self'    no inline scripts, no eval, no other origins
 *   connect-src          where the page may send data. This is what stops an
 *                        attacker exfiltrating what they stole
 *
 * **`'unsafe-inline'` on scripts throws most of it away.** It is also the
 * first thing people add when a third-party widget breaks. If you need inline
 * scripts, use a nonce the build generates per response.
 *
 * `frame-ancestors 'none'` is clickjacking protection and replaces the old
 * `X-Frame-Options` header. `base-uri 'self'` stops an injected `<base>`
 * pointing every relative URL at another origin, which is a real and very
 * quiet attack.
 *
 * **Start in report-only.** `Content-Security-Policy-Report-Only` sends
 * violations to `report-uri` and blocks nothing, so you find out what your
 * page actually loads before you break it for everyone.
 */
import { useState } from "react";

import { baselineCsp, sanitise, serialiseCsp } from "../lib/security";

const SAMPLES = [
  { label: "Ordinary formatting", html: "<p>Hello <strong>world</strong></p>" },
  { label: "A script tag", html: '<p>Hi</p><script>alert("xss")</script>' },
  { label: "An event handler", html: '<img src="x" onerror="alert(1)">' },
  { label: "A javascript: URL", html: '<a href="javascript:alert(1)">Click me</a>' },
  { label: "A base tag", html: '<base href="https://evil.example.com/">' },
];

export function Security() {
  const [custom, setCustom] = useState('<img src=x onerror="alert(1)">');
  const policy = serialiseCsp(baselineCsp({ apiUrl: "https://api.example.com" }));

  return (
    <div className="stack">
      <h3>What sanitising removes</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }} data-testid="samples">
        <thead>
          <tr>
            {["Input", "After DOMPurify"].map((heading) => (
              <th key={heading} style={{ textAlign: "left", padding: "0.3rem 1rem 0.3rem 0" }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLES.map((sample) => (
            <tr key={sample.label}>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0", verticalAlign: "top" }}>
                <code>{sample.html}</code>
              </td>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0", verticalAlign: "top" }}>
                <code>{sanitise(sample.html) || "(nothing left)"}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Try it</h3>
      <label className="row">
        HTML
        <input
          aria-label="HTML"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          style={{ flex: 1, minWidth: "20rem" }}
        />
      </label>
      <p className="note">
        Sanitised: <code data-testid="custom-output">{sanitise(custom) || "(nothing left)"}</code>
      </p>
      <div
        className="card"
        data-testid="rendered"
        // The one place this is acceptable: the input went through sanitise()
        // on the line above.
        dangerouslySetInnerHTML={{ __html: sanitise(custom) }}
      />

      <h3>A baseline policy</h3>
      <pre className="log" data-testid="csp">
        {policy.split("; ").join(";\n")}
      </pre>

      <p className="note">
        Serve it as a header, not a <code>&lt;meta&gt;</code> tag: a meta tag cannot express
        <code>frame-ancestors</code> or <code>report-uri</code>. Start with
        <code>Content-Security-Policy-Report-Only</code> so you find out what your page really loads
        before blocking anything.
      </p>
    </div>
  );
}
