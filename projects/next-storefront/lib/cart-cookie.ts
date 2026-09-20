/**
 * The only place the cart touches a cookie. Everything else works on the
 * plain object in `cart.ts`, which is why the rules are testable without a
 * request.
 */
import "server-only";
import { cookies } from "next/headers";

import { parseCart, serialiseCart, type Cart } from "./cart";

const NAME = "cart";

export async function readCart(): Promise<Cart> {
  // `cookies()` is async in Next 16 and reading it opts the route out of
  // static rendering, which is correct: a page whose content depends on
  // this request cannot be one prerendered file shared by everybody.
  const store = await cookies();

  return parseCart(store.get(NAME)?.value);
}

export async function writeCart(cart: Cart): Promise<void> {
  const store = await cookies();

  store.set(NAME, serialiseCart(cart), {
    // httpOnly, because nothing in the browser needs to read this and a
    // readable cookie is one more thing an injected script can take.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
