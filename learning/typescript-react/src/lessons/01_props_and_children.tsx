/**
 * Props, children, and extending a DOM element
 * ============================================
 * **`children` is `ReactNode`.** Not `JSX.Element`, not `ReactElement`.
 * `ReactNode` is the honest type of "whatever can be rendered": an element, a
 * string, a number, an array of those, `null`, `undefined`, `false`. Type it as
 * `ReactElement` and `<Card>hello</Card>` stops compiling, because a string is
 * not an element. Narrow it only when you genuinely need to inspect what you
 * were given, which is rare and usually a design smell.
 *
 * **Extend the element you are wrapping.** A `Button` that only accepts
 * `onClick` is a button somebody will have to abandon the first time they need
 * `type="submit"`, `aria-label`, `disabled` or `form`. Take everything a real
 * `<button>` takes and add to it:
 *
 *   type ButtonProps = ComponentProps<"button"> & { variant?: Variant };
 *
 * `ComponentProps<"button">` is every prop React accepts on that element, `ref`
 * included. `ComponentPropsWithoutRef<"button">` is the same minus `ref`, which
 * mattered before React 19 made `ref` an ordinary prop and is mostly historical
 * now.
 *
 * **Put `...rest` first when you spread it.** Order decides who wins:
 *
 *   <button {...rest} className={merged} />   your className wins
 *   <button className={merged} {...rest} />   theirs does, silently
 *
 * Neither is wrong, but pick deliberately. The first is right for a class you
 * computed from a variant; the second is right when callers are meant to be
 * able to override.
 *
 * **`type` or `interface`?** For props, `type`. Interfaces merge declarations,
 * so two libraries declaring `interface ButtonProps` in the same scope silently
 * combine instead of conflicting, and `type` composes with unions and
 * intersections, which props types end up needing. Use `interface` when you
 * specifically want something extendable from outside.
 */
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "quiet" | "danger";

const VARIANT_COLOR: Record<Variant, string> = {
  primary: "var(--accent)",
  quiet: "var(--muted)",
  danger: "var(--danger)",
};

// Everything a <button> takes, plus one prop of ours.
type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", style, ...rest }: ButtonProps) {
  // `rest` spread first, so the colour below is not overwritten by a caller who
  // happened to pass `style`. Their other style properties still apply, because
  // the object below is merged rather than replacing theirs.
  return <button {...rest} style={{ color: VARIANT_COLOR[variant], ...style }} />;
}

type CardProps = {
  title: string;
  // A string, a number, an element, an array, or nothing. All of it renders.
  children: ReactNode;
  // Not `children`: a second slot has to be its own prop. React only has one
  // `children`, and a component that needs two areas takes two props.
  footer?: ReactNode;
};

export function Card({ title, children, footer }: CardProps) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "1rem",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div>{children}</div>
      {footer !== undefined && <div className="note">{footer}</div>}
    </section>
  );
}

export function PropsAndChildren() {
  return (
    <div className="stack">
      <div className="row">
        <Button onClick={() => alert("clicked")}>Primary</Button>
        <Button variant="quiet" type="submit">
          Quiet submit
        </Button>
        <Button variant="danger" disabled aria-label="delete everything">
          Danger
        </Button>
      </div>

      <Card title="Children is ReactNode" footer="footer is a separate prop">
        A string is a valid child. So is {42}, so is <strong>an element</strong>, so is an array of
        them, and so is {null}.
      </Card>

      <p className="note">
        Every one of those buttons takes <code>type</code>, <code>disabled</code> and{" "}
        <code>aria-label</code> without anyone having written them into a props type. That is what
        extending <code>ComponentProps&lt;"button"&gt;</code> buys.
      </p>
    </div>
  );
}
