/**
 * Where a token can live
 * ======================
 * There is no storage that is safe against everything, and the advice that
 * gets repeated as a slogan, "never put a token in localStorage", is half of
 * a sentence. The useful version is: **any script running on your origin can
 * read anything JavaScript can read.** That includes a script injected by XSS
 * and a compromised dependency you installed last week.
 *
 *   memory              gone on reload. Cannot be stolen from storage, and
 *                       *can* be read by a script while the page is open
 *   localStorage        readable by any script, survives forever
 *   sessionStorage      readable by any script, scoped to one tab
 *   HttpOnly cookie     not readable by JavaScript at all
 *
 * **The HttpOnly cookie is the one that is different in kind.** The browser
 * attaches it and never exposes it to script, so an XSS payload can *use* the
 * session by making requests, and cannot exfiltrate the token itself. That is
 * a real difference: a stolen token works from the attacker's machine forever,
 * a hijacked session only works while the victim's page is open.
 *
 * The price is that it is sent automatically, which is what CSRF exploits.
 * `SameSite=Lax` handles most of it by not sending the cookie on cross-site
 * POSTs. `Strict` also drops it on ordinary inbound links, which logs people
 * out when they arrive from an email, so `Lax` plus a CSRF token for state
 * changes is the usual answer.
 *
 * **The pattern that is actually good**, and what most serious apps do: a
 * short-lived access token in memory, and a long-lived refresh token in an
 * HttpOnly, Secure, SameSite cookie scoped to the refresh endpoint. A reload
 * silently gets a new access token from the cookie. XSS cannot read either
 * one at rest.
 *
 * **What none of this fixes.** If you have XSS, the attacker can make requests
 * as the user from the page, whatever you did with the token. Storage choice
 * changes how long the compromise lasts and how far it travels. Getting the
 * previous lesson right matters more than getting this one right.
 */
import { useState } from "react";

import { ASSESSMENTS, auditCookie, setCookie } from "../lib/auth";

const COOKIE_SAMPLES = [
  {
    label: "A good session cookie",
    header: setCookie({ name: "sid", value: "abc", maxAgeSeconds: 3600 }),
  },
  { label: "Readable by script", header: "sid=abc; Path=/; Secure; SameSite=Lax" },
  { label: "Sent over http", header: "sid=abc; Path=/; HttpOnly; SameSite=Lax" },
  { label: "Cross-site without Secure", header: "sid=abc; Path=/; HttpOnly; SameSite=None" },
];

export function AuthInTheBrowser() {
  const [stored, setStored] = useState<string | null>(null);

  return (
    <div className="stack">
      <h3>The four places</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }} data-testid="storages">
        <thead>
          <tr>
            {["Storage", "Script can read", "Survives reload", "Sent automatically"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "0.3rem 0.8rem 0.3rem 0" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ASSESSMENTS.map((entry) => (
            <tr key={entry.storage}>
              <td style={{ padding: "0.25rem 0.8rem 0.25rem 0" }}>
                <code>{entry.storage}</code>
              </td>
              <td style={{ padding: "0.25rem 0.8rem 0.25rem 0" }}>
                {entry.readableByScript ? "yes" : "no"}
              </td>
              <td style={{ padding: "0.25rem 0.8rem 0.25rem 0" }}>
                {entry.survivesReload ? "yes" : "no"}
              </td>
              <td style={{ padding: "0.25rem 0.8rem 0.25rem 0" }}>
                {entry.sentAutomatically ? "yes, so CSRF applies" : "no"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>What &ldquo;readable by script&rdquo; means</h3>
      <div className="row">
        <button
          onClick={() => {
            localStorage.setItem("demo-token", "eyJhbGciOiJIUzI1NiJ9.pretend");
            setStored(localStorage.getItem("demo-token"));
          }}
        >
          Store a token in localStorage
        </button>
        <button
          onClick={() => {
            // Any script can do this. An injected one, or one inside a
            // dependency you did not read.
            setStored(localStorage.getItem("demo-token"));
          }}
        >
          Read it from somewhere else
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("demo-token");
            setStored(null);
          }}
        >
          Clear
        </button>
      </div>
      <pre className="log" data-testid="stolen">
        {stored === null ? "nothing stored" : `any script can read: ${stored}`}
      </pre>

      <h3>Auditing a Set-Cookie header</h3>
      {COOKIE_SAMPLES.map((sample) => {
        const problems = auditCookie(sample.header);

        return (
          <div key={sample.label} className="stack">
            <p>
              <strong>{sample.label}</strong>
            </p>
            <pre className="log">{sample.header}</pre>
            {problems.length === 0 ? (
              <p className="note">no problems</p>
            ) : (
              <ul style={{ color: "var(--danger)", margin: 0 }}>
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <p className="note">
        The pattern worth copying: a short-lived access token in memory, a refresh token in an
        HttpOnly, Secure, SameSite cookie scoped to the refresh endpoint.
      </p>
    </div>
  );
}
