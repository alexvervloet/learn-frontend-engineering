/**
 * Typing context and custom hooks
 * ===============================
 * **Context has a default value, and yours is almost certainly a lie.**
 * `createContext` demands one. The three options:
 *
 *   createContext<Theme>({} as Theme)     a lie. Forget the provider and you
 *                                         get `undefined is not a function`
 *                                         somewhere far from the cause
 *   createContext<Theme>(realDefault)     fine when a sensible default exists
 *   createContext<Theme | null>(null)     honest, and needs narrowing
 *
 * The third is right for anything a provider must supply, and the narrowing
 * lives in one place:
 *
 *   export function useTheme(): Theme {
 *     const value = use(ThemeContext);
 *     if (value === null) throw new Error("useTheme must be used inside <ThemeProvider>");
 *     return value;
 *   }
 *
 * That throw buys two things. The return type is `Theme`, not `Theme | null`, so
 * no consumer writes `?.` ever again. And the failure names the mistake instead
 * of surfacing as a property access on undefined three components away. Export
 * the hook, not the context: nobody outside this file needs the raw object, and
 * keeping it private means the narrowing cannot be bypassed.
 *
 * **A hook returning a tuple needs `as const`.** TypeScript widens an array
 * literal to an array of the union of its members:
 *
 *   return [on, toggle];             (boolean | (() => void))[]   useless
 *   return [on, toggle] as const;    readonly [boolean, () => void]
 *
 * Without it, destructuring gives both variables that union, and calling
 * `toggle()` does not compile. The alternative is an explicit return type on the
 * hook, which is arguably clearer and is what `useToggle` does below.
 *
 * Return an object rather than a tuple when there are more than two values, or
 * when callers will want to rename only some of them. Tuples are for the
 * `useState` shape, where renaming both at the call site is the norm.
 */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

export type Theme = {
  name: "light" | "dark";
  toggle: () => void;
};

// Private. Consumers get the hook below instead, so the null can only be
// narrowed in one place.
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<Theme["name"]>("light");

  const value = useMemo<Theme>(
    () => ({
      name,
      toggle: () => setName((current) => (current === "light" ? "dark" : "light")),
    }),
    [name],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  const value = use(ThemeContext);

  // The whole point. Callers get `Theme`, and a missing provider says so.
  if (value === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }

  return value;
}

/**
 * The explicit return type is doing the same job `as const` would, and says it
 * more directly. Either is fine; leaving both off is not.
 */
export function useToggle(initial = false): readonly [boolean, () => void] {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((current) => !current), []);

  return [on, toggle];
}

function ThemeReadout() {
  // `theme` is Theme. No optional chaining anywhere below.
  const theme = useTheme();
  const [expanded, toggleExpanded] = useToggle();

  return (
    <div className="stack">
      <p>
        theme: <strong data-testid="theme">{theme.name}</strong>
      </p>
      <div className="row">
        <button onClick={theme.toggle}>Toggle theme</button>
        <button onClick={toggleExpanded}>{expanded ? "Hide" : "Show"} details</button>
      </div>
      {expanded && (
        <p className="note" data-testid="details">
          The context object is private to the module. Only <code>useTheme</code> is exported, so
          nothing can read it without going through the null check.
        </p>
      )}
    </div>
  );
}

export function ContextAndHooks() {
  return (
    <div className="stack">
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>

      <p className="note">
        Render <code>&lt;ThemeReadout /&gt;</code> without the provider and it throws with the name
        of the hook you got wrong, rather than failing on a property of undefined somewhere else.
      </p>
    </div>
  );
}
