import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { baselineCsp, sanitise, serialiseCsp } from "../lib/security";
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
