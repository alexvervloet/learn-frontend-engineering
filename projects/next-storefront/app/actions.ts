"use server";

/**
 * Server actions: the write half of the app.
 *
 * "use server" marks every export here as a callable endpoint. That is worth
 * saying plainly, because it is the part people get wrong: these functions
 * are reachable by anyone who can reach the site, with any arguments, and
 * the fact that the only caller is a form you wrote means nothing. So every
 * one of them validates its input and re-reads the price from the
 * catalogue rather than trusting what arrived.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getProduct } from "@/lib/catalogue";
import { addItem, removeItem, setQuantity } from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-cookie";

export type ActionState = { ok: boolean; message: string };

const slugField = z.string().min(1).max(64);

const addSchema = z.object({
  slug: slugField,
  quantity: z.coerce.number().int().min(1).max(10),
});

const quantitySchema = z.object({
  slug: slugField,
  // 0 is allowed here and means "remove", which is what the quantity
  // stepper sends when you press minus on the last one.
  quantity: z.coerce.number().int().min(0).max(10),
});

export async function addToCart(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "That request did not make sense." };

  // The stock number comes from the catalogue, never from the form. A
  // hidden input saying stock=999 is trivial to send.
  const product = await getProduct(parsed.data.slug);
  if (product === null) return { ok: false, message: "That product no longer exists." };
  if (product.stock === 0) return { ok: false, message: `${product.name} is out of stock.` };

  const cart = await readCart();
  const next = addItem(cart, product.slug, product.stock, parsed.data.quantity);

  if (next[product.slug] === cart[product.slug]) {
    return { ok: false, message: `Only ${String(product.stock)} left, and they are in your bag.` };
  }

  await writeCart(next);
  // The layout renders the bag count, so the count is stale everywhere
  // until this runs. "/" with "layout" covers every page under it.
  revalidatePath("/", "layout");

  return { ok: true, message: `${product.name} added.` };
}

export async function updateQuantity(formData: FormData): Promise<void> {
  const parsed = quantitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const product = await getProduct(parsed.data.slug);
  if (product === null) return;

  await writeCart(setQuantity(await readCart(), product.slug, parsed.data.quantity, product.stock));
  revalidatePath("/", "layout");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const slug = slugField.safeParse(formData.get("slug"));
  if (!slug.success) return;

  await writeCart(removeItem(await readCart(), slug.data));
  revalidatePath("/", "layout");
}

const checkoutSchema = z.object({
  email: z.email("That email does not look right."),
  name: z.string().trim().min(2, "Your name, please."),
  postcode: z
    .string()
    .trim()
    .regex(/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, "That is not a UK postcode."),
});

export async function checkout(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    // The first message, not all of them: the form shows field errors
    // itself, and this line is the summary a screen reader announces.
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const cart = await readCart();
  if (Object.keys(cart).length === 0) return { ok: false, message: "Your bag is empty." };

  await writeCart({});
  revalidatePath("/", "layout");
  // redirect() throws, so nothing after it runs. It must come after the
  // write, not before, and it cannot be inside a try/catch that swallows
  // the control-flow error it uses.
  redirect("/checkout/done");
}
