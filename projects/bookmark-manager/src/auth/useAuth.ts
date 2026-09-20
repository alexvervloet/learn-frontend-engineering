import { use } from "react";

import { AuthContext, type AuthState } from "./context";

/**
 * Throws rather than returning null, so every consumer gets `AuthState` and
 * none of them writes `?.`. A missing provider names the hook that was
 * misused instead of failing on a property of undefined three components
 * away. See learning/typescript-react.
 */
export function useAuth(): AuthState {
  const value = use(AuthContext);
  if (value === null) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
