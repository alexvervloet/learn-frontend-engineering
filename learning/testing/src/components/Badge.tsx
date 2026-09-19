import type { ComponentProps, ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "danger";

const TONE_STYLE: Record<BadgeTone, { background: string; color: string }> = {
  neutral: { background: "var(--accent-soft)", color: "var(--text)" },
  success: { background: "oklch(0.92 0.09 150)", color: "oklch(0.32 0.09 150)" },
  danger: { background: "oklch(0.92 0.07 25)", color: "oklch(0.35 0.14 25)" },
};

type Props = ComponentProps<"span"> & {
  tone?: BadgeTone;
  children: ReactNode;
  /** Announced instead of the visible text, for a badge whose text is a glyph or a number. */
  label?: string;
};

export function Badge({ tone = "neutral", label, children, style, ...rest }: Props) {
  return (
    <span
      {...rest}
      // Not a plain span: a status badge that changes needs to be announced.
      role="status"
      aria-label={label}
      style={{
        display: "inline-block",
        padding: "0.12rem 0.5rem",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        ...TONE_STYLE[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
