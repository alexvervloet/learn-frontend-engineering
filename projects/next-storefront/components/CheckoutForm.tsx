"use client";

import { useActionState } from "react";

import { checkout, type ActionState } from "@/app/actions";

const EMPTY: ActionState = { ok: true, message: "" };

const FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "postcode", label: "Postcode", type: "text", autoComplete: "postal-code" },
] as const;

/**
 * The validation that matters runs in the action, on the server. These
 * inputs carry `required` and a type, which is the browser's own first pass
 * and costs nothing, but nothing here is trusted: the same Zod schema runs
 * again before anything is written.
 */
export function CheckoutForm() {
  const [state, action, pending] = useActionState(checkout, EMPTY);

  return (
    <form action={action} className="max-w-sm space-y-3" data-testid="checkout-form">
      <h2 className="text-lg font-semibold">Checkout</h2>

      {FIELDS.map((field) => (
        <label key={field.name} className="block text-sm">
          {field.label}
          <input
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            className="mt-1 block w-full rounded-lg px-3 py-2"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          />
        </label>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        data-testid="place-order"
      >
        {pending ? "Placing…" : "Place the order"}
      </button>

      <p role="status" aria-live="polite" className="text-sm" data-testid="checkout-error">
        {state.ok ? "" : state.message}
      </p>
    </form>
  );
}
