import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router";
import type { ReactNode } from "react";

import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { makeQueryClient } from "./queryClient";
import { routes } from "./routes";
import { SignIn } from "./routes/SignIn";

/** Signed out shows the form; there is nothing else to look at. */
export function Gate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  return status === "signed-in" ? <>{children}</> : <SignIn />;
}

export function Providers({
  queryClient,
  children,
}: {
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

export function App() {
  const queryClient = makeQueryClient();
  const router = createBrowserRouter(routes);

  return (
    <Providers queryClient={queryClient}>
      <Gate>
        <RouterProvider router={router} />
      </Gate>
    </Providers>
  );
}
