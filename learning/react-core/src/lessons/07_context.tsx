/**
 * Context, and the re-renders it causes
 * =====================================
 * Context passes a value down without threading it through every component in
 * between. It is not a state manager, and it has no way to tell one consumer
 * from another: **when the value changes, every component reading that context
 * re-renders**, whether or not it cares about the part that changed.
 *
 * That gives two rules worth following from the start.
 *
 * **Split contexts by how often they change.** A single `AppContext` holding
 * the theme, the signed-in user and the cart means changing the theme
 * re-renders everything that reads the user. Two contexts, and each consumer
 * only hears about what it asked for. The demo has both side by side, with
 * render counters.
 *
 * **Memoise the value if it is an object.** `value={{ user, theme }}` builds a
 * new object every render, and a new object is never `Object.is`-equal to the
 * last one, so every consumer re-renders every time the provider does. `useMemo`
 * with honest dependencies fixes it. A single primitive needs no memo.
 *
 * Note `use(Context)` rather than `useContext(Context)`. React 19 added `use`,
 * which does the same thing here but, unlike a hook, may be called inside a
 * condition or a loop. `useContext` is not deprecated and both will keep
 * working.
 *
 * When context is not the answer: a value that changes many times a second (a
 * mouse position, a form field being typed into) will re-render the whole
 * subtree. That is what the state-management module's stores, with their
 * per-component selectors, are for.
 */
import { createContext, memo, use, useMemo, useState } from "react";

import { useRenderCount } from "../useRenderCount";

type User = { name: string };

const CombinedContext = createContext<{ theme: string; user: User } | null>(null);
const ThemeContext = createContext("light");
const UserContext = createContext<User>({ name: "Ada" });

// memo so that the only thing that can re-render these is a context change.
// Without it they would re-render because their parent did, and the lesson
// would prove nothing.
const CombinedUserName = memo(function CombinedUserName() {
  const value = use(CombinedContext);
  const renders = useRenderCount();

  return (
    <p>
      {value?.user.name}, renders: <strong data-testid="combined-renders">{renders}</strong>
    </p>
  );
});

const SplitUserName = memo(function SplitUserName() {
  const user = use(UserContext);
  const renders = useRenderCount();

  return (
    <p>
      {user.name}, renders: <strong data-testid="split-renders">{renders}</strong>
    </p>
  );
});

const SplitTheme = memo(function SplitTheme() {
  const theme = use(ThemeContext);
  const renders = useRenderCount();

  return (
    <p>
      {theme}, renders: <strong data-testid="split-theme-renders">{renders}</strong>
    </p>
  );
});

export function Context() {
  const [theme, setTheme] = useState("light");
  // The user never changes in this demo, which is the point: only the theme
  // does, and only one of the two panels should notice.
  const user = useMemo<User>(() => ({ name: "Ada" }), []);
  const combined = useMemo(() => ({ theme, user }), [theme, user]);

  return (
    <div className="stack">
      <button onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}>
        Toggle theme (currently {theme})
      </button>

      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <section>
          <h3>One context for everything</h3>
          <CombinedContext value={combined}>
            <CombinedUserName />
          </CombinedContext>
          <p className="note">Re-renders on every theme change, though the name never moves.</p>
        </section>

        <section>
          <h3>One context per concern</h3>
          <ThemeContext value={theme}>
            <UserContext value={user}>
              <SplitUserName />
              <SplitTheme />
            </UserContext>
          </ThemeContext>
          <p className="note">Only the theme reader re-renders.</p>
        </section>
      </div>

      <p className="note">
        <code>&lt;ThemeContext value=…&gt;</code> with no <code>.Provider</code> is React 19. The
        old spelling still works.
      </p>
    </div>
  );
}
