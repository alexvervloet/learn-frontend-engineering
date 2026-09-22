/**
 * A pretend session, and it says so.
 *
 * Signed with HMAC-SHA256 so the cookie cannot be edited, which is the one
 * property worth demonstrating. It is not authentication: there is no
 * password, no user store and no expiry beyond the cookie's own. Swapping
 * this for Auth.js or a real provider changes this file and nothing else,
 * which is the point of keeping it to one file.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export { SESSION_COOKIE } from "./cookie-names";

// A real app reads this from the environment and fails to boot without it.
const SECRET = process.env["SESSION_SECRET"] ?? "dev-only-not-a-secret";

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function createSession(email: string): string {
  return `${Buffer.from(email).toString("base64url")}.${sign(email)}`;
}

export function readSession(token: string | undefined): string | null {
  if (token === undefined) return null;

  // Check the shape before the signature, and check it exactly.
  //
  // `const [encoded, signature] = token.split(".")` takes the first two fields
  // and silently drops the rest, so `<valid token>.anything` verified and
  // returned the email. The signed part was still the real one, so it was not
  // an escalation, but a cookie the attacker can append to is a cookie the
  // signature has stopped fully covering, and that is the whole point of
  // having one.
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  if (encoded === undefined || signature === undefined) return null;

  const email = Buffer.from(encoded, "base64url").toString();
  const expected = sign(email);

  // Bytes, not characters, and the difference is a live bug rather than a
  // nicety. `timingSafeEqual` throws unless both buffers are the same byte
  // length, and `"é".length` is 1 while `Buffer.byteLength("é")` is 2. A
  // cookie of 43 multi-byte characters passed a check on `.length` and then
  // threw ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH from the compare, so a forged
  // cookie produced a server error instead of a redirect to sign in.
  const received = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (received.length !== wanted.length) return null;

  // Constant time, so the signature cannot be guessed a byte at a time by
  // measuring how long each rejection takes.
  if (!timingSafeEqual(received, wanted)) return null;

  return email;
}
