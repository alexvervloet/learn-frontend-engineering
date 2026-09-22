import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  REPORT_GROUP,
  baselineCsp,
  reportingEndpointsHeader,
  sanitise,
  serialiseCsp,
} from "../lib/security";
import { Security } from "./02_security";

describe("sanitising", () => {
  it("keeps ordinary formatting", () => {
    expect(sanitise("<p>Hello <strong>world</strong></p>")).toBe(
      "<p>Hello <strong>world</strong></p>",
    );
  });

  it("removes a script tag entirely", () => {
    expect(sanitise('<p>Hi</p><script>alert("xss")</script>')).toBe("<p>Hi</p>");
  });

  it("removes an event handler while keeping the element", () => {
    const clean = sanitise('<img src="x" onerror="alert(1)">');

    expect(clean).not.toContain("onerror");
    // img is not in the allow-list either, so nothing survives. An allow-list
    // fails closed; a block-list fails open.
    expect(clean).toBe("");
  });

  it("strips a javascript: URL but keeps the link text", () => {
    const clean = sanitise('<a href="javascript:alert(1)">Click me</a>');

    expect(clean).not.toContain("javascript:");
    expect(clean).toContain("Click me");
  });

  it("keeps an ordinary link", () => {
    expect(sanitise('<a href="https://example.com">Docs</a>')).toContain(
      'href="https://example.com"',
    );
  });

  it("removes a base tag, which quietly redirects every relative URL", () => {
    expect(sanitise('<base href="https://evil.example.com/">')).toBe("");
  });

  it("survives the malformed markup that defeats hand-rolled filters", () => {
    // A regex looking for "<script>" misses every one of these.
    for (const attack of [
      "<scr<script>ipt>alert(1)</script>",
      "<IMG SRC=javascript:alert(1)>",
      "<svg/onload=alert(1)>",
      '<a href="  javascript:alert(1)">x</a>',
    ]) {
      const clean = sanitise(attack);
      expect(clean.toLowerCase()).not.toContain("javascript:");
      expect(clean.toLowerCase()).not.toContain("onload");
      expect(clean.toLowerCase()).not.toContain("<script");
    }
  });
});

/**
 * The served policy, parsed out of the nginx config.
 *
 * `baselineCsp()` is what this lesson teaches and what every test above
 * checks. It is not what anybody gets: the container serves the header in
 * `nginx-security-headers.conf`, written by hand. Two copies of one decision
 * drift, and the drift is silent, because a weaker policy breaks nothing and
 * a missing directive is only missing.
 *
 * So the file is read and compared. The CI smoke test already curls the
 * running container and greps for the header; this checks it says the same
 * thing the lesson does.
 */
const nginxConf = readFileSync(
  join(import.meta.dirname, "..", "..", "nginx-security-headers.conf"),
  "utf8",
);

/**
 * The directives, with the `#` comments removed.
 *
 * Assert the absence of a string in a file whose comments explain why that
 * string is absent, and the comment is what you find. The HSTS block below
 * says "`preload` is deliberately absent", so `not.toContain("preload")` went
 * looking for the word and read the sentence saying it is not there.
 *
 * LESSONS.md has an entry on this from the first time. It has now happened
 * three times in this repo, always in a test that reads a real config or
 * stylesheet off disk. Strip comments before matching, every time.
 */
const nginxRules = nginxConf.replace(/^\s*#.*$/gm, "");

function servedPolicy(): Record<string, string[]> {
  const header = /add_header Content-Security-Policy "([^"]+)"/.exec(nginxRules);
  if (header === null) throw new Error("no Content-Security-Policy in the nginx config");

  const parsed: Record<string, string[]> = {};
  for (const directive of (header[1] ?? "").split(";")) {
    const [name, ...values] = directive.trim().split(/\s+/);
    if (name !== undefined && name !== "") parsed[name] = values;
  }
  return parsed;
}

describe("the policy the container actually serves", () => {
  it("declares every directive the lesson's baseline does", () => {
    const served = servedPolicy();
    const baseline = baselineCsp({ apiUrl: "https://api.example.com" });

    // Add a directive to security.ts and forget the conf and this fails by
    // name, which is the whole reason it exists.
    expect(Object.keys(served).sort()).toEqual(Object.keys(baseline).sort());
  });

  it("matches the baseline on every directive that is pure policy", () => {
    const served = servedPolicy();
    const baseline = baselineCsp({ apiUrl: "https://api.example.com" });

    for (const [name, values] of Object.entries(baseline)) {
      // connect-src is the one that legitimately differs: the baseline takes
      // an API origin as an argument and the served app has none.
      if (name === "connect-src") continue;
      expect(served[name], `${name} differs between the lesson and the conf`).toEqual(values);
    }
  });

  it("sets HSTS, without preload", () => {
    expect(nginxRules).toMatch(/Strict-Transport-Security "max-age=\d+; includeSubDomains"/);
    // preload asks browser vendors to hard-code the domain and takes months
    // to undo. Not a default.
    expect(nginxRules).not.toContain("preload");
  });
});

describe("the baseline policy", () => {
  const directives = baselineCsp({ apiUrl: "https://api.example.com" });

  it("does not allow inline scripts or eval", () => {
    // The two that give away most of the protection, and the first two people
    // add when a widget breaks.
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("limits where the page may send data", () => {
    // What turns a stolen token into one the attacker cannot exfiltrate.
    expect(directives["connect-src"]).toEqual(["'self'", "https://api.example.com"]);
  });

  it("blocks framing and base-tag injection", () => {
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["base-uri"]).toEqual(["'self'"]);
    expect(directives["form-action"]).toEqual(["'self'"]);
  });

  it("blocks plugin documents, which nothing uses and everything forgets", () => {
    // object-src 'none' and base-uri are the two Google's CSP Evaluator calls
    // mandatory. This one gets left out because nobody has embedded a plugin
    // this decade, which is also why nobody notices it missing.
    expect(directives["object-src"]).toEqual(["'none'"]);
  });

  it("reports to both the deprecated directive and its replacement", () => {
    const reporting = baselineCsp({
      apiUrl: "https://api.example.com",
      reportUri: "https://example.com/csp",
    });

    // report-uri is deprecated and still the only one some browsers honour;
    // report-to replaces it. Send both until the old one is unused.
    expect(reporting["report-uri"]).toEqual(["https://example.com/csp"]);
    expect(reporting["report-to"]).toEqual([REPORT_GROUP]);
  });

  it("names the group in a header, or the reports go nowhere", () => {
    // `report-to csp` with nothing defining the group `csp` is dropped
    // silently, which looks exactly like having no violations.
    expect(reportingEndpointsHeader("https://example.com/csp")).toBe(
      'csp="https://example.com/csp"',
    );
  });

  it("falls back to a closed default", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
  });

  it("serialises to a header value", () => {
    const header = serialiseCsp({ "default-src": ["'self'"], "script-src": ["'self'"] });

    expect(header).toBe("default-src 'self'; script-src 'self'");
  });

  it("adds a report endpoint when given one", () => {
    const withReport = baselineCsp({ apiUrl: "https://api.example.com", reportUri: "/csp" });

    expect(serialiseCsp(withReport)).toContain("report-uri /csp");
  });
});

describe("the lesson", () => {
  it("renders only what survived sanitising", async () => {
    render(<Security />);

    const input = screen.getByRole("textbox", { name: "HTML" });
    await userEvent.clear(input);
    await userEvent.type(input, "<b>bold</b>");

    expect(screen.getByTestId("rendered").innerHTML).toBe("<b>bold</b>");
  });

  it("renders nothing for an attack", async () => {
    render(<Security />);

    const input = screen.getByRole("textbox", { name: "HTML" });
    await userEvent.clear(input);
    // `[[` escapes user-event's special-character syntax for `{`.
    await userEvent.type(input, "<svg onload=alert(1)>");

    expect(screen.getByTestId("rendered").innerHTML).toBe("");
  });
});
