import { signOut } from "@/app/actions";

/**
 * A Server Component with a form. No "use client" and no JavaScript: the
 * button posts to the action, the action clears the cookie and redirects.
 */
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg px-4 py-2 text-sm"
        style={{ border: "1px solid var(--line)" }}
        data-testid="sign-out"
      >
        Sign out
      </button>
    </form>
  );
}
