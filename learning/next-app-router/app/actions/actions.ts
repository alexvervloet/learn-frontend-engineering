"use server";

import { revalidatePath } from "next/cache";

import { addReview } from "@/lib/data";

/**
 * A server action. The directive marks every export in this file as callable
 * from the client by reference: Next replaces the function with an id, and a
 * POST to that id runs the real one on the server.
 *
 * **It is a public endpoint.** That is the thing to internalise. Anyone can
 * post to it with any arguments, so it needs the same validation and
 * authorisation checks an API route would. "It is only called from a form I
 * control" is not true of anything on the web.
 *
 * `revalidatePath` clears the cached render for a path, so the next request
 * rebuilds it. Without it the page keeps showing what it showed before, which
 * is the most common "my action worked but nothing changed" report.
 */
export type ActionState = { ok: boolean; message: string };

export async function submitReview(
  _previous: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const text = String(formData.get("review") ?? "").trim();

  // Validate here, not only in the browser. The client's copy of the rules is
  // a courtesy to the person typing; this is the check.
  if (text.length < 5) {
    return { ok: false, message: "A review needs at least five characters." };
  }
  if (text.length > 200) {
    return { ok: false, message: "Keep it under 200 characters." };
  }

  await addReview("keyboard", text);

  // Without this the page renders from cache and the new review does not
  // appear, which looks like the action silently failing.
  revalidatePath("/actions");

  return { ok: true, message: "Thank you." };
}
