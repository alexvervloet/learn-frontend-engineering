import { Link } from "react-router";

import { RouteHeading } from "../components/RouteHeading";

/** The splat route. The default is a bare page that says nothing useful. */
export function NotFound() {
  return (
    <div className="space-y-4" data-testid="not-found">
      <RouteHeading>Nothing here</RouteHeading>
      <p className="text-[var(--text-muted)]">That page does not exist.</p>
      <Link className="underline" to="/bookmarks">
        Back to your bookmarks
      </Link>
    </div>
  );
}
