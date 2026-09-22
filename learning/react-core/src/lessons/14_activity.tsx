/**
 * &lt;Activity&gt;: hidden, but not thrown away
 * ========================================
 * There are two ways to take something off the screen, and until React 19.2
 * you had to pick one and live with what it cost.
 *
 *   {open && <Panel />}        unmount. State is gone, effects are cleaned
 *                              up, and coming back is a fresh mount with a
 *                              fresh fetch and a scroll position of zero
 *   style={{display: "none"}}  keep it. State survives, and so does every
 *                              effect: the interval still ticks, the socket
 *                              still holds open, the observer still fires for
 *                              a panel nobody can see
 *
 * The first loses the user's work. The second keeps paying for it. Tabs are
 * the obvious case: retype your filters every time you switch tab, or let
 * four hidden tabs poll the server forever.
 *
 * `<Activity mode="hidden">` is the third option. The children stay mounted
 * and keep their state, and React *cleans up their effects* as if they had
 * unmounted. Show it again and the effects are created again and the state is
 * still there.
 *
 *   <Activity mode={tab === "search" ? "visible" : "hidden"}>
 *     <SearchPanel />
 *   </Activity>
 *
 * So the rule is worth saying plainly: **state persists, effects do not.**
 * That split is the whole feature. Everything you were keeping the component
 * mounted *for* is state, and everything that made it expensive to keep
 * mounted is effects.
 *
 * **What it means for your effects.** They have to be honest about setup and
 * teardown, which lesson 05 already asked of them. An effect that connects in
 * the body and disconnects in the cleanup works here without a change. An
 * effect that treats mount as "run once, forever" breaks, because hiding and
 * showing now runs it again. This is the same discipline StrictMode has been
 * enforcing in development all along, which is the point of StrictMode.
 *
 * **It is not just for tabs.** `mode="hidden"` also pre-renders: React builds
 * the subtree at a low priority without showing it, so the content of the
 * next route or the next step of a wizard is ready before the user asks. The
 * work happens when the browser is idle instead of when the click lands.
 *
 * **What it is not.** It is not a performance switch to sprinkle around. A
 * hidden Activity still occupies memory for its whole tree and its state, so
 * hiding fifty of something is worse than unmounting forty-nine. Use it where
 * losing state is a real cost to a real person: a half-filled form, a scroll
 * position, a long filter someone typed.
 *
 * The demo is three tabs. Each counts its own mounts and keeps its own text,
 * with the same panel rendered three ways so the difference is not a claim
 * you have to take on faith.
 */
import { Activity, useEffect, useState, useSyncExternalStore } from "react";

type TabName = "unmounted" | "hidden-with-css" | "activity";

/**
 * One panel, used by all three strategies.
 *
 * `onEffectRun` is called from an effect with proper cleanup, so it counts
 * setups rather than renders. That is the number that separates the three:
 * unmounting runs it again and loses the text, CSS-hiding never runs it again
 * and never stops it, Activity runs it again and keeps the text.
 */
function Panel({ label, onEffectRun }: { label: string; onEffectRun: () => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    onEffectRun();
    // A real panel opens something here. The cleanup is what lets Activity
    // hide this without leaving it running.
    return () => {};
    // An honest array rather than `[]` plus a silenced lint rule. It works out
    // to the same thing only because `onEffectRun` really is stable: it is a
    // method on a store created once by a lazy useState initialiser. If it were an inline arrow this
    // effect would re-run on every parent render and the counts would be
    // measuring renders instead of setups, which is the bug the empty array
    // would have hidden.
  }, [onEffectRun]);

  return (
    <label className="row">
      {label}
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="type something, then switch tab"
        data-testid={`input-${label}`}
      />
    </label>
  );
}

/**
 * A counter that lives outside React, read through `useSyncExternalStore`.
 *
 * The obvious version of this is a ref that the effect increments and the
 * render reads, and it is wrong twice over: reading a ref during render is
 * the impurity lesson 04 is about, and nothing tells React the number
 * changed, so the screen shows a stale count until something else re-renders.
 *
 * The first draft here did something worse and more interesting. It returned
 * a `Display` component defined inline, so every render of the parent created
 * a new function, React saw a different component type, and it unmounted the
 * old span and mounted a fresh one reading `0`. The counter went *down*. A
 * component defined during render is a new component every time.
 *
 * An external store is the honest shape: a value React does not own, a way to
 * subscribe to it, and a hook whose whole job is joining the two.
 */
function createCounter() {
  let value = 0;
  const listeners = new Set<() => void>();

  return {
    bump(): void {
      value += 1;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    read: (): number => value,
  };
}

function useSetupCounter() {
  // `useState(createCounter)`, not `useRef(null)` filled in on first render.
  //
  // The lazy initialiser runs once and the store is stable for the life of the
  // component, which is the same thing the ref version was reaching for. The
  // difference is that this one can be read during render and the ref cannot:
  // `react-hooks/refs` rejects the lazy-ref spelling, and it is right to. A
  // ref is for values render does not use, and this store is read by every
  // render.
  //
  // Per mount rather than per module, so two tests do not share a tally.
  const [store] = useState(createCounter);

  const count = useSyncExternalStore(store.subscribe, store.read);

  return { bump: store.bump, count };
}

export function ActivityLesson() {
  const [tab, setTab] = useState<TabName>("unmounted");

  const unmounted = useSetupCounter();
  const css = useSetupCounter();
  const activity = useSetupCounter();

  return (
    <div className="stack">
      <div className="row" role="tablist" aria-label="Strategies">
        {(["unmounted", "hidden-with-css", "activity"] as const).map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            data-testid={`tab-${name}`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="stack">
        <p>
          <strong>{"{open && <Panel/>}"}</strong> · effect setups:{" "}
          <span data-testid="setups-unmounted">{unmounted.count}</span>
        </p>
        {tab === "unmounted" && <Panel label="unmounted" onEffectRun={unmounted.bump} />}
      </div>

      <div className="stack">
        <p>
          <strong>display: none</strong> · effect setups:{" "}
          <span data-testid="setups-css">{css.count}</span>
        </p>
        <div style={{ display: tab === "hidden-with-css" ? "block" : "none" }}>
          <Panel label="css" onEffectRun={css.bump} />
        </div>
      </div>

      <div className="stack">
        <p>
          <strong>{"<Activity>"}</strong> · effect setups:{" "}
          <span data-testid="setups-activity">{activity.count}</span>
        </p>
        <Activity mode={tab === "activity" ? "visible" : "hidden"}>
          <Panel label="activity" onEffectRun={activity.bump} />
        </Activity>
      </div>

      <p className="note">
        Type into each panel, then cycle the tabs and come back. The unmounted one has forgotten
        what you typed and its setup count has gone up. The CSS one remembers, and its count has
        never moved, because its effect never stopped. The Activity one remembers <em>and</em> its
        count went up, which is the combination the other two cannot give you: the state stayed, the
        work did not.
      </p>
    </div>
  );
}
