import { useCallback, useMemo, useState, type ReactNode } from "react";

import { getMe, logIn as logInRequest, setAccessToken } from "../api/client";
import type { User } from "../api/types";
import { AuthContext, type AuthState } from "./context";

/**
 * The token lives in memory, in `src/api/client.ts`, and this context holds
 * the user it belongs to.
 *
 * Reloading logs you out, which is the honest consequence of not putting a
 * token in localStorage where any script can read it. A real deployment pairs
 * this with a refresh token in an HttpOnly, Secure, SameSite cookie scoped to
 * the refresh endpoint, so a reload silently gets a new access token. The
 * production module's auth lesson has the full comparison.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("signed-out");
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (username: string, password: string) => {
    setStatus("signing-in");
    setError(null);

    try {
      const token = await logInRequest(username, password);
      setAccessToken(token);
      setUser(await getMe());
      setStatus("signed-in");
    } catch (failure) {
      // The token is cleared on any failure, so a half-completed sign-in
      // cannot leave a stale one behind.
      setAccessToken(null);
      setUser(null);
      setStatus("signed-out");
      setError(failure instanceof Error ? failure.message : "Could not sign in");
    }
  }, []);

  const signOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("signed-out");
    setError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, status, error, signIn, signOut }),
    [user, status, error, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
