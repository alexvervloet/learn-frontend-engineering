import { describe, expect, it } from "vitest";

import { createSession, readSession } from "./session";

describe("the session cookie", () => {
  it("round-trips an email", () => {
    expect(readSession(createSession("person@example.com"))).toBe("person@example.com");
  });

  it("rejects a cookie somebody edited", () => {
    const token = createSession("person@example.com");
    const [, signature] = token.split(".");
    const forged = `${Buffer.from("admin@example.com").toString("base64url")}.${signature ?? ""}`;

    // Without the signature check this is how you become admin: edit one
    // base64 field in devtools.
    expect(readSession(forged)).toBeNull();
  });

  it("rejects nonsense rather than throwing", () => {
    // All of these arrive eventually, because a cookie is user input.
    expect(readSession(undefined)).toBeNull();
    expect(readSession("")).toBeNull();
    expect(readSession("no-dot")).toBeNull();
    expect(readSession("a.b")).toBeNull();
    expect(readSession("....")).toBeNull();
  });
});

describe("where to go after signing in", () => {
  // The same rule the action applies, spelled out. `next` comes from the
  // query string, so a link like `/sign-in?next=https://evil.example`
  // sends people off your domain right after they sign in.
  function safeNext(value: string): string {
    return value.startsWith("/") && !value.startsWith("//") ? value : "/orders";
  }

  it("keeps a path on this site", () => {
    expect(safeNext("/orders")).toBe("/orders");
    expect(safeNext("/cart")).toBe("/cart");
  });

  it("refuses anywhere else", () => {
    expect(safeNext("https://evil.example")).toBe("/orders");
    // Protocol-relative: a browser reads this as another origin.
    expect(safeNext("//evil.example")).toBe("/orders");
    expect(safeNext("javascript:alert(1)")).toBe("/orders");
  });
});
