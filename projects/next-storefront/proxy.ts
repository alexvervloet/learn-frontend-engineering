import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/cookie-names";

/**
 * `proxy.ts`, not `middleware.ts`. Next 16 renamed it, and the old name
 * still builds with a deprecation warning.
 *
 * It runs before the route, on every matching request, at the edge. What
 * that makes it good for is redirecting. What it does not make it good for
 * is authorisation: this checks whether a cookie is present, not whether
 * it is valid, because verifying the signature needs `node:crypto` and the
 * Edge runtime does not have it. Importing a module that touches crypto
 * here fails the build, which is a good way to find out.
 *
 * So the real check is in the page, which reads and verifies the same
 * cookie. That split is the thing to take away. This is a fast gate that
 * saves rendering a page nobody may see. It is not the lock. A page that
 * trusts it and does not check for itself is one routing mistake away from
 * being open, and it does not run for a server action at all.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  // Where to go afterwards, so signing in does not dump you on the home
  // page having forgotten what you were doing.
  signIn.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(signIn);
}

export const config = {
  // Only the protected routes. Matching everything and then filtering in
  // code means middleware runs on every image and script too.
  matcher: ["/orders/:path*"],
};
