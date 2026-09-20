import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * The page heading, which takes focus when the user navigates and not
 * otherwise.
 *
 * A browser moves focus to the top of the document on a real navigation. A
 * client-side router does not: nothing is announced, and the next Tab
 * resumes from wherever the old link was. Moving focus to the new page's
 * `<h1>` fixes that, and `tabIndex={-1}` makes it focusable by script
 * without adding a tab stop for everyone else.
 *
 * Two cases where moving it is wrong, and both were found by tests rather
 * than by thinking about it.
 *
 * **On arrival.** The browser already has focus at the start of the
 * document, so stealing it puts the user *past* the skip link, which is the
 * single most useful thing on the page for a keyboard user. React Router
 * gives the initial history entry the key `"default"`, which is the signal.
 *
 * **On a redirect.** `/` renders `<Navigate replace to="/bookmarks" />`, and
 * that is a REPLACE navigation with a fresh key, so the key check alone does
 * not catch it: a visitor typing the bare domain still landed past the skip
 * link. A redirect is not something the user did, so it should not move
 * their focus either.
 */
export function RouteHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (key === "default") return;
    if (navigationType === "REPLACE") return;
    ref.current?.focus();
  }, [key, navigationType]);

  return (
    <h1 ref={ref} tabIndex={-1} className="text-2xl font-semibold tracking-tight">
      {children}
    </h1>
  );
}
