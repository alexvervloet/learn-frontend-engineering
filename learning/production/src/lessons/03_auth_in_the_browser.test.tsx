import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { assess, auditCookie, setCookie } from "../lib/auth";
import { AuthInTheBrowser } from "./03_auth_in_the_browser";

afterEach(() => {
  localStorage.clear();
});

describe("the trade each storage makes", () => {
  it("marks the three JavaScript-readable ones as readable", () => {
    for (const storage of ["memory", "localStorage", "sessionStorage"] as const) {
      expect(assess(storage).readableByScript).toBe(true);
    }
  });

  it("marks the HttpOnly cookie as the one that is different in kind", () => {
    const cookie = assess("httpOnlyCookie");

    expect(cookie.readableByScript).toBe(false);
    // And the price: it is attached to requests, so CSRF applies.
    expect(cookie.sentAutomatically).toBe(true);
  });

  it("is honest that memory does not survive a reload", () => {
    expect(assess("memory").survivesReload).toBe(false);
  });
});

describe("building a session cookie", () => {
  it("sets the three attributes that matter by default", () => {
    const header = setCookie({ name: "sid", value: "abc", maxAgeSeconds: 3600 });

    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
  });

  it("encodes the value", () => {
    const header = setCookie({ name: "sid", value: "a b;c", maxAgeSeconds: 60 });

    // An unencoded semicolon would end the cookie and start an attribute.
    expect(header).toContain("sid=a%20b%3Bc");
  });
});

describe("auditing one", () => {
  it("passes a good header", () => {
    expect(auditCookie(setCookie({ name: "sid", value: "abc", maxAgeSeconds: 60 }))).toEqual([]);
  });

  it("catches a missing HttpOnly, which is the one that matters", () => {
    const problems = auditCookie("sid=abc; Path=/; Secure; SameSite=Lax");

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("HttpOnly");
  });

  it("catches a cookie that would go over plain http", () => {
    expect(auditCookie("sid=abc; HttpOnly; SameSite=Lax").join(" ")).toContain("Secure");
  });

  it("catches SameSite=None without Secure, which browsers reject outright", () => {
    const problems = auditCookie("sid=abc; HttpOnly; SameSite=None");

    expect(problems.join(" ")).toContain("rejected by browsers");
  });
});

describe("the demonstration", () => {
  it("shows that any script can read what another script stored", async () => {
    render(<AuthInTheBrowser />);

    await userEvent.click(screen.getByRole("button", { name: "Store a token in localStorage" }));
    await userEvent.click(screen.getByRole("button", { name: "Read it from somewhere else" }));

    // This is the whole argument. An injected script does exactly this.
    expect(screen.getByTestId("stolen")).toHaveTextContent("any script can read: eyJ");
  });

  it("clears it again", async () => {
    render(<AuthInTheBrowser />);

    await userEvent.click(screen.getByRole("button", { name: "Store a token in localStorage" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByTestId("stolen")).toHaveTextContent("nothing stored");
    expect(localStorage.getItem("demo-token")).toBeNull();
  });
});
