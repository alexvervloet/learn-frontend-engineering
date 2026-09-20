import { createContext } from "react";

import type { User } from "../api/types";

export type AuthState = {
  user: User | null;
  status: "signed-out" | "signing-in" | "signed-in";
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
};

/**
 * The context object, in its own file.
 *
 * Fast Refresh cannot swap a module that exports a context alongside a
 * component: the context identity would change and every consumer would lose
 * its value. Keeping it here means editing the provider hot-reloads instead
 * of reloading the page, and `useAuth` in `useAuth.ts` is the only thing
 * that reads it.
 */
export const AuthContext = createContext<AuthState | null>(null);
