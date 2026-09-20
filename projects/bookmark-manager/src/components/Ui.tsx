import type { ComponentProps, ReactNode } from "react";

import { cx } from "./cx";

const BUTTON_BASE =
  "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const BUTTON_TONE = {
  primary: "bg-brand-500 text-white hover:bg-brand-700",
  quiet: "border border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]",
  danger: "border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
} as const;

export function Button({
  tone = "quiet",
  className,
  ...rest
}: ComponentProps<"button"> & { tone?: keyof typeof BUTTON_TONE }) {
  // `className` last, so a caller's override wins. Reversed, the prop is
  // decorative. See learning/styling.
  return <button {...rest} className={cx(BUTTON_BASE, BUTTON_TONE[tone], className)} />;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A status region that exists from the first render, empty.
 *
 * A region rendered *with* its content is a new node rather than a change to
 * a watched one, and screen readers announce it inconsistently or not at all.
 * See the accessibility module.
 */
export function StatusRegion({ message }: { message: string | null }) {
  return (
    <p
      role="status"
      aria-atomic="true"
      data-testid="count-region"
      className="text-sm text-[var(--text-muted)]"
    >
      {message ?? ""}
    </p>
  );
}

export function ErrorBanner({ title, detail }: { title: string; detail?: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-500 bg-red-50 p-4 text-red-900 dark:bg-red-950 dark:text-red-100"
    >
      <p className="font-semibold">✕ {title}</p>
      {detail !== undefined && <p className="mt-1 text-sm">{detail}</p>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <p className="text-sm text-[var(--text-muted)]" role="status">
      {label}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-medium">{title}</p>
      {children !== undefined && (
        <div className="mt-2 text-sm text-[var(--text-muted)]">{children}</div>
      )}
    </Card>
  );
}
