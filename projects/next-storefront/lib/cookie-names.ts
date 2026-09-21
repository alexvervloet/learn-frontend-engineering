/**
 * Just the names, in a module that imports nothing.
 *
 * `proxy.ts` runs in the Edge runtime, which has no `node:crypto`. Reading
 * this constant from `session.ts` pulled the whole signing module in with
 * it and broke the build:
 *
 *     Warning: A Node.js module is loaded ('node:crypto') which is not
 *     supported in the Edge Runtime.
 *
 * Which is the same boundary the proxy's own comment is about: it can
 * route, it cannot verify.
 */
export const SESSION_COOKIE = "session";
export const CART_COOKIE = "cart";
