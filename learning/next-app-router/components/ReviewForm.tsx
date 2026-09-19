"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitReview, type ActionState } from "@/app/actions/actions";

/**
 * The client half of a server action.
 *
 * `useActionState` wraps the action and hands back its return value plus a
 * pending flag. It is a React hook, not a Next one: react-core lesson 10 uses
 * the same hook with a plain async function.
 *
 * Without JavaScript this is still a working form. The `action` prop points at
 * a real endpoint Next generated, the browser posts it, and the server
 * re-renders the page. The submit button loses its pending label and nothing
 * else changes.
 */
function SubmitButton() {
  // Has to be a child of the form. Called in the component that renders the
  // <form> it would always report pending: false.
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Posting…" : "Post the review"}
    </button>
  );
}

export function ReviewForm() {
  const [state, formAction] = useActionState<ActionState | null, FormData>(submitReview, null);

  return (
    <form action={formAction} className="row">
      <input
        name="review"
        aria-label="Review"
        placeholder="at least five characters"
        minLength={5}
      />
      <SubmitButton />

      {state !== null && (
        <p
          role={state.ok ? "status" : "alert"}
          data-testid="action-result"
          style={{ color: state.ok ? undefined : "var(--danger)" }}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
