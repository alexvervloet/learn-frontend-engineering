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

  /**
   * A token is two fields, so anything with a third is not a token.
   *
   * Destructuring the first two parts out of `split(".")` and ignoring the
   * rest accepted `<valid token>.whatever-the-attacker-likes`: the email came
   * back and the request was authenticated. Not an escalation, because the
   * email is still the signed one, but the cookie was malleable, which is the
   * one property the signature is here to remove. Verify the shape, then the
   * signature.
   */
  it("rejects a valid token with anything appended to it", () => {
    const token = createSession("person@example.com");

    expect(readSession(token)).toBe("person@example.com");
    expect(readSession(`${token}.`)).toBeNull();
    expect(readSession(`${token}.attacker-controlled`)).toBeNull();
    expect(readSession(`.${token}`)).toBeNull();
  });

  /**
   * The test the first version of this file was missing, and the reason the
   * one above is not enough: every string in it fails on character length
   * too, so none of them reached the compare.
   *
   * A signature of 43 multi-byte characters is 43 long and 86 bytes. Against
   * a check on `.length` it got past the guard and threw out of
   * `timingSafeEqual`, which Next renders as a server error. Reached in the
   * running app with a percent-encoded cookie, because cookie values are
   * decoded before they are handed to the route.
   */
  it("rejects a signature that is the right length in the wrong units", () => {
    const encoded = Buffer.from("admin@example.com").toString("base64url");
    const signature = "é".repeat(43);

    expect(signature).toHaveLength(43);
    expect(Buffer.byteLength(signature)).toBe(86);

    expect(() => readSession(`${encoded}.${signature}`)).not.toThrow();
    expect(readSession(`${encoded}.${signature}`)).toBeNull();
  });
});
