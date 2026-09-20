/**
 * `clsx` in four lines: this app does not need the dependency.
 *
 * Its own file so `Ui.tsx` exports components and nothing else, which is
 * what Fast Refresh needs to swap a module rather than reload the page.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
