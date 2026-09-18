/**
 * Generic and polymorphic components
 * ==================================
 * **A generic component is a generic function.** Nothing special happens
 * because it returns JSX:
 *
 *   function List<T>({ items, renderItem }: ListProps<T>) { … }
 *
 * `T` is inferred from `items` at each call site, so `renderItem`'s parameter is
 * typed without anyone writing an annotation. Type `items` as `unknown[]` or
 * `any[]` instead and every call site loses that.
 *
 * `readonly T[]` rather than `T[]` in the props, because a component has no
 * business mutating an array it was handed, and `readonly` lets callers pass a
 * `as const` array or a frozen one.
 *
 * **The `<T,>` gotcha.** In a `.tsx` file an arrow function's `<T>` parses as a
 * JSX tag. The trailing comma disambiguates:
 *
 *   const f = <T,>(items: T[]) => items[0];
 *
 * A `function` declaration has no such problem, which is one reason this repo
 * declares components with `function`.
 *
 * **Constrain or take a function, not both.** Two ways to get a key:
 *
 *   <T extends { id: string }>   simple, and excludes every list of strings
 *   getKey: (item: T) => string  works for anything, one more prop to pass
 *
 * `getKey` is the better default. A component that only accepts objects with an
 * `id` is one you will end up copy-pasting the day you have a list of strings.
 *
 * **Polymorphic components cost more than they look.** A `Text` that renders as
 * any element needs `ElementType`, a generic default, `ComponentPropsWithoutRef`
 * and an `Omit`, and *still* needs one internal cast, because TypeScript cannot
 * prove that a spread of props derived from `E` is assignable to an element of
 * type `E`. The cast is contained and the call sites are fully checked, which is
 * the trade. Do this in a design system you are writing once. Do not reach for
 * it in application code, where two components would have been less work than
 * one clever one.
 */
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type ListProps<T> = {
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
};

export function List<T>({ items, getKey, renderItem, empty = "Nothing here" }: ListProps<T>) {
  if (items.length === 0) return <p className="note">{empty}</p>;

  return (
    <ul>
      {items.map((item, index) => (
        <li key={getKey(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

type TextProps<E extends ElementType> = {
  as?: E;
  children: ReactNode;
  // Everything the chosen element takes, minus the two props we define
  // ourselves. Without the Omit, `as` and `children` are declared twice and the
  // intersection makes them impossible to satisfy.
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children">;

export function Text<E extends ElementType = "span">({ as, children, ...rest }: TextProps<E>) {
  const Component = (as ?? "span") as ElementType;

  // The one cast. `rest` is `Omit<ComponentPropsWithoutRef<E>, …>`, and
  // TypeScript cannot check that against `Component`, whose type it has widened
  // to ElementType. Call sites are still fully checked; only this line is not.
  return <Component {...(rest as Record<string, unknown>)}>{children}</Component>;
}

type Person = { id: string; name: string; role: string };

const PEOPLE: readonly Person[] = [
  { id: "1", name: "Ada", role: "engineer" },
  { id: "2", name: "Grace", role: "admiral" },
];

const TAGS = ["react", "typescript", "vite"] as const;

export function GenericComponents() {
  return (
    <div className="stack">
      <h3>One List, two element types</h3>

      {/* T is Person. `person` below needs no annotation. */}
      <List
        items={PEOPLE}
        getKey={(person) => person.id}
        renderItem={(person) => (
          <>
            {person.name} · <span className="note">{person.role}</span>
          </>
        )}
      />

      {/* T is "react" | "typescript" | "vite", from the `as const` array. */}
      <List
        items={TAGS}
        getKey={(tag) => tag}
        renderItem={(tag, index) => `${index + 1}. ${tag}`}
      />

      <List items={[]} getKey={String} renderItem={String} empty="No results" />

      <h3>One Text, several elements</h3>
      <Text as="h4">A heading</Text>
      <Text>A span, because that is the default</Text>
      <Text as="a" href="https://react.dev">
        An anchor, and href only compiles because as is "a"
      </Text>

      <p className="note">
        Change the anchor to <code>as="h4"</code> in your editor and <code>href</code> becomes an
        error on the same line.
      </p>
    </div>
  );
}
