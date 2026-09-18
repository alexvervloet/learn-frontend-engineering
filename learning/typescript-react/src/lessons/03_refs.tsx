/**
 * Typing refs
 * ===========
 * `useRef` has two shapes, and the difference is the initial value.
 *
 *   useRef<HTMLInputElement>(null)   RefObject<HTMLInputElement | null>
 *   useRef(0)                        RefObject<number>
 *
 * The first is for a DOM node. It starts `null` because the element does not
 * exist until React has committed, so every read needs `?.` or a check. That is
 * not the types being awkward: between the first render and the commit, the
 * node genuinely is not there.
 *
 * The second is for a value you want to survive renders without causing one. No
 * `null`, because you supplied a real initial value.
 *
 * In React 19 `useRef` requires an argument. `useRef<number>()` used to give you
 * `MutableRefObject<number | undefined>`; now it is an error, and the fix is to
 * say what it starts as.
 *
 * **`ref` is an ordinary prop.** `forwardRef` is no longer needed. A component
 * that wants to accept one declares it:
 *
 *   function Field({ ref, ...rest }: ComponentProps<"input">) {
 *     return <input ref={ref} {...rest} />;
 *   }
 *
 * `ComponentProps<"input">` already includes `ref`, which is why nothing extra
 * is declared above. Code still using `forwardRef` keeps working; there is just
 * no reason to write new code that way.
 *
 * **A ref callback can return a cleanup.** Also React 19:
 *
 *   <div ref={(node) => { obs.observe(node); return () => obs.unobserve(node); }} />
 *
 * Before, React called the callback again with `null` on unmount and you
 * branched on it. If you return a cleanup, React stops passing `null`, so a
 * callback cannot do both. Mixing the two styles is the one migration hazard
 * here.
 *
 * **Refs do not re-render.** The counter below proves it: the timer's tick count
 * lives in a ref, and the display only catches up when something else renders.
 * That is exactly what you want for a timer id and exactly what you do not want
 * for anything on screen.
 */
import { useRef, useState, type ComponentProps } from "react";

/** `ref` arrives as a prop. No forwardRef, and nothing extra in the props type. */
function Field({ ref, label, ...rest }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="row">
      {label}
      <input ref={ref} aria-label={label} {...rest} />
    </label>
  );
}

export function Refs() {
  // Starts null: the input does not exist on the first render.
  const inputRef = useRef<HTMLInputElement>(null);

  // Starts 0: a plain value that should not cause renders.
  const ticksRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(0);
  const [width, setWidth] = useState<number | null>(null);

  function toggle(): void {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setRunning(false);
      return;
    }

    // window.setInterval returns a number; the Node typings return a Timeout.
    // Saying `window.` avoids the mismatch without casting.
    timerRef.current = window.setInterval(() => {
      ticksRef.current += 1;
    }, 100);
    setRunning(true);
  }

  return (
    <div className="stack">
      <Field label="Target" ref={inputRef} />
      <div className="row">
        <button onClick={() => inputRef.current?.focus()}>Focus it</button>
        <button
          onClick={() => {
            // `?.` is not defensive noise. Before the commit this really is null.
            inputRef.current?.select();
          }}
        >
          Select its text
        </button>
      </div>

      <div className="row">
        <button onClick={toggle}>{running ? "Stop the timer" : "Start the timer"}</button>
        <button onClick={() => setShown(ticksRef.current)}>Read the tick count</button>
        <span data-testid="ticks">shown: {shown}</span>
      </div>

      {/* A ref callback that returns its own cleanup. React 19 only. */}
      <div
        ref={(node) => {
          // Still `HTMLDivElement | null`. React only stops passing null at
          // runtime once you return a cleanup; the type has not narrowed to
          // match, so the guard stays.
          if (node === null) return;

          const observer = new ResizeObserver(([entry]) => {
            if (entry !== undefined) setWidth(Math.round(entry.contentRect.width));
          });
          observer.observe(node);
          return () => observer.disconnect();
        }}
        style={{ border: "1px dashed var(--border)", padding: "0.5rem" }}
      >
        This box measures itself: {width === null ? "…" : `${width}px`}
      </div>

      <p className="note">
        Start the timer and wait. Nothing moves. Press “Read the tick count” and it jumps to
        wherever it had got to. The ref was counting the whole time; nothing was watching it.
      </p>
    </div>
  );
}
