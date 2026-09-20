import { useState } from "react";

import { useAuth } from "../auth/useAuth";
import { Button, Card, ErrorBanner } from "../components/Ui";

/**
 * The sign-in gate. Shown instead of the app when there is no token, rather
 * than as a route: there is nothing to look at when signed out, so a redirect
 * would only add a URL that renders the same thing.
 */
export function SignIn() {
  const { signIn, status, error } = useAuth();
  const [username, setUsername] = useState("ada");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      {/* A plain heading, not RouteHeading. The gate renders outside the
          router, and RouteHeading reads `location.key` to decide whether this
          is a navigation or an arrival. */}
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>

      <Card className="mt-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void signIn(username, password);
          }}
        >
          {error !== null && <ErrorBanner title="Could not sign in" detail={error} />}

          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
            />
          </div>

          <Button type="submit" tone="primary" disabled={status === "signing-in"}>
            {status === "signing-in" ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-sm text-[var(--text-muted)]">
            The mock API accepts <code>ada</code> and <code>correct-horse</code>. Anything else gets
            a 401, so the failure path is reachable.
          </p>
        </form>
      </Card>
    </div>
  );
}
