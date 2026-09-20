import { NavLink, Outlet, useNavigation } from "react-router";

import { useAuth } from "../auth/useAuth";
import { Button } from "../components/Ui";

/**
 * The layout route. It renders once and stays mounted as the pages below it
 * change, so the navigation keeps its scroll position and its state.
 */
export function Root() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

  return (
    <div className="min-h-dvh">
      {/* The single highest-value accessibility feature on any page with a
          navigation: one link, visible on focus, straight to the content. */}
      <a className="skip-link" href="#main">
        Skip to the content
      </a>

      <header className="border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-semibold">Bookmarks</span>

          <nav aria-label="Main" className="flex gap-3 text-sm">
            <NavLink
              to="/bookmarks"
              end
              className={({ isActive }) => (isActive ? "font-semibold text-brand-500" : undefined)}
            >
              All
            </NavLink>
            <NavLink
              to="/bookmarks/new"
              className={({ isActive }) => (isActive ? "font-semibold text-brand-500" : undefined)}
            >
              Add
            </NavLink>
          </nav>

          <span className="ml-auto flex items-center gap-3 text-sm">
            {/* The old page stays on screen while the next one loads, so
                without this a slow navigation looks like a dead link. */}
            <span data-testid="nav-state" className="text-[var(--text-muted)]">
              {navigation.state === "idle" ? "" : "loading…"}
            </span>
            {user !== null && (
              <>
                <span className="text-[var(--text-muted)]">{user.username}</span>
                <Button onClick={signOut}>Sign out</Button>
              </>
            )}
          </span>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
