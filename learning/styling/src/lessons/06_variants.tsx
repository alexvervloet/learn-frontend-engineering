/**
 * Variants: cva, clsx, and tailwind-merge
 * =======================================
 * A component with three sizes and four intents is twelve class strings. Written
 * by hand it becomes a ternary nobody can read, and the day someone passes
 * `className="px-8"` to override the padding, it silently does nothing.
 *
 * Three small libraries, each doing one job:
 *
 *   clsx             conditionals to a string
 *   tailwind-merge   resolve conflicting utilities, last one wins
 *   cva              declare the variant table, get a typed function
 *
 * `cn()` in `src/cn.ts` is the first two together. `cva` is the third:
 *
 *   const button = cva("rounded font-medium", {
 *     variants: { intent: { … }, size: { … } },
 *     compoundVariants: [{ intent: "danger", size: "sm", class: "…" }],
 *     defaultVariants: { intent: "neutral", size: "md" },
 *   });
 *
 * Two things this buys beyond tidiness.
 *
 * **The variant names become types.** `VariantProps<typeof button>` is
 * `{ intent?: "neutral" | "primary" | "danger"; size?: "sm" | "md" | "lg" }`,
 * derived from the table, so a typo in a variant name is a compile error and
 * the props type cannot drift from the styles.
 *
 * **Compound variants handle the combinations** that are not the sum of their
 * parts. A small danger button needing a heavier border is one entry, not a
 * special case threaded through two lookups.
 *
 * **The order in `cn` matters and is easy to get backwards.** The caller's
 * `className` goes last:
 *
 *   cn(button({ intent, size }), className)
 *
 * Reverse it and the component's own classes win, so the `className` prop
 * becomes decorative. That is the single most common bug in a component library
 * built this way, and it is invisible until someone tries to override something.
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../cn";

export const buttonStyles = cva("rounded-lg font-medium transition-colors", {
  variants: {
    intent: {
      neutral: "bg-brand-50 text-brand-700 hover:bg-brand-200",
      primary: "bg-brand-500 text-white hover:bg-brand-700",
      danger: "bg-red-600 text-white hover:bg-red-700",
    },
    size: {
      sm: "px-2 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    },
  },
  compoundVariants: [
    // Not the sum of its parts: a small danger button needs the extra weight to
    // read as a warning at that size.
    { intent: "danger", size: "sm", class: "ring-2 ring-red-300" },
  ],
  defaultVariants: { intent: "neutral", size: "md" },
});

export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonStyles>;

export function Button({ intent, size, className, ...rest }: ButtonProps) {
  // className last. Reversed, the caller's override loses.
  return <button className={cn(buttonStyles({ intent, size }), className)} {...rest} />;
}

const INTENTS = ["neutral", "primary", "danger"] as const;
const SIZES = ["sm", "md", "lg"] as const;

export function Variants() {
  return (
    <div className="stack">
      <h3>The table, rendered</h3>
      <div className="flex flex-col gap-gutter">
        {INTENTS.map((intent) => (
          <div key={intent} className="flex items-center gap-gutter">
            {SIZES.map((size) => (
              <Button key={size} intent={intent} size={size}>
                {intent} {size}
              </Button>
            ))}
          </div>
        ))}
      </div>

      <h3>An override that actually overrides</h3>
      <div className="row">
        <Button size="sm" data-testid="default-padding">
          px-2 from the size variant
        </Button>
        <Button size="sm" className="px-8" data-testid="overridden-padding">
          px-8 from className
        </Button>
      </div>

      <p className="note">
        The second button really is wider. Swap the arguments to <code>cn</code> in this file and it
        stops being wider, with no error and nothing in the console.
      </p>
    </div>
  );
}
