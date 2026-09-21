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

  const [encoded, signature] = token.split(".");
  if (encoded === undefined || signature === undefined) return null;

  const email = Buffer.from(encoded, "base64url").toString();
  const expected = sign(email);

  // Length first, because timingSafeEqual throws on a mismatch, and then a
  // constant-time compare so the signature cannot be guessed a byte at a
  // time by measuring how long the rejection takes.
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  return email;
}
