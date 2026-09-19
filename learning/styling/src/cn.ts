import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The two-line helper almost every Tailwind codebase ends up with, usually
 * called `cn`. It does two separate jobs and it is worth knowing which is
 * which.
 *
 * `clsx` flattens conditionals into a string:
 *
 *   clsx("p-2", isActive && "bg-brand-500", { "opacity-50": disabled })
 *
 * `twMerge` then resolves conflicts *within* that string, keeping the last of
 * each conflicting group:
 *
 *   twMerge("px-2 px-4")            "px-4"
 *   twMerge("p-2 px-4")             "p-2 px-4"   (different groups, both kept)
 *   twMerge("text-sm text-lg")      "text-lg"
 *
 * Without the merge, `"px-2 px-4"` both end up in the class attribute and the
 * winner is whichever Tailwind emitted later in the stylesheet, not the one you
 * wrote last. That is the bug: a caller passing `className="px-8"` to override
 * a component's `px-2` appears to do nothing, intermittently, depending on the
 * order the utilities happen to sit in the output.
 *
 * It is not free. `twMerge` parses every class name against a table of
 * conflict groups, so it costs real time in a list of a thousand rows. Use it
 * on components that accept a `className` from outside, which is where the
 * conflicts come from, and not on every div.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
