/**
 * Refs: the values React does not watch
 * =====================================
 * A ref is a box with a `current` property that survives re-renders and does
 * *not* trigger one when you change it. That single difference decides when to
 * use one:
 *
 *   state   the UI depends on it. Changing it must re-render
 *   ref     the UI does not depend on it. A timer id, the previous value, a
 *           "have I already scrolled" flag, a DOM node
 *
 * Writing to `ref.current` and expecting the screen to update is the mistake.
 * Nothing is watching. The demo shows a ref counter that climbs invisibly and
 * only appears on screen when something else causes a render.
 *
 * The other half is DOM refs. There are things React has no declarative API
 * for, and focus is the big one: after you open a dialog, or delete a row, or
 * submit a form with errors, something has to decide where the keyboard goes.
 * A screen reader user with no focus management is left at the top of the
 * document with no idea anything happened.
 *
 * **React 19 changed two things here.**
 *
 * `ref` is now an ordinary prop. `forwardRef` still works and is no longer
 * needed: a function component can take `ref` alongside its other props.
 *
 * A ref callback can now return a cleanup function, the way an effect does:
 *
 *   <div ref={(node) => { observer.observe(node); return () => observer.unobserve(node); }} />
 *
 * Before that, React called the callback again with `null` on unmount and you
 * had to branch on it.
 */
import { useRef, useState } from "react";

/** `ref` as a plain prop. No forwardRef anywhere. */
function TextField({ label, ref }: { label: string; ref?: React.Ref<HTMLInputElement> }) {
  return (
    <label className="row">
      {label}
      <input ref={ref} aria-label={label} />
    </label>
  );
}

export function RefsAndFocus() {
  const [stateCount, setStateCount] = useState(0);
  const refCount = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="stack">
      <TextField label="Target" ref={inputRef} />

      <div className="row">
        <button onClick={() => inputRef.current?.focus()}>Focus the field</button>
        <button
          onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
        >
          Focus and select
        </button>
      </div>

      <hr style={{ width: "100%", border: 0, borderTop: "1px solid var(--border)" }} />

      <div className="row">
        <button onClick={() => (refCount.current += 1)}>Increment the ref</button>
        <button onClick={() => setStateCount((c) => c + 1)}>Increment the state</button>
      </div>
      <p>
        {/* Reading a ref during render is what react-hooks/refs forbids, and the
            stale number on screen is precisely the bug it is warning about. */}
        {/* eslint-disable-next-line react-hooks/refs */}
        ref: <strong data-testid="ref-count">{refCount.current}</strong> &nbsp; state:{" "}
        <strong data-testid="state-count">{stateCount}</strong>
      </p>

      <p className="note">
        Press “Increment the ref” five times: nothing moves. Press “Increment the state” once and
        the ref jumps to 6. It had been counting the whole time. Nothing had asked React to look.
      </p>
    </div>
  );
}
