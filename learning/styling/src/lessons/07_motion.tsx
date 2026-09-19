/**
 * Animation, and the users who do not want it
 * ===========================================
 * **Reach for CSS first.** A `transition` on `opacity` or `transform` is
 * declarative, runs on the compositor, and costs no JavaScript. It covers
 * hovers, focus rings, disclosure panels and most state changes. Animating
 * `width`, `height`, `top` or `margin` instead makes the browser re-run layout
 * on every frame, which is where janky CSS animation comes from. Stick to
 * `transform` and `opacity` and you get 60fps almost for free.
 *
 * **Reach for a library when CSS cannot express it:** spring physics, gestures,
 * animating something as it unmounts, or shared-element transitions between
 * layouts. Motion (what Framer Motion became) does all four. The one below is
 * the unmount case, which CSS genuinely cannot do on its own: by the time React
 * has removed the node there is nothing left to transition.
 *
 * **`prefers-reduced-motion` is not optional.** For people with vestibular
 * disorders, a large parallax or a spinning transition causes real nausea and
 * dizziness. The setting exists, the OS exposes it, and honouring it is one
 * media query:
 *
 *   @media (prefers-reduced-motion: reduce) {
 *     *, *::before, *::after {
 *       animation-duration: 0.01ms !important;
 *       transition-duration: 0.01ms !important;
 *     }
 *   }
 *
 * That blanket rule is a reasonable safety net, and `0.01ms` rather than `0` so
 * that `transitionend` still fires and code waiting on it does not hang.
 *
 * **Reduced does not mean none.** The useful reading is "no large movement",
 * not "no feedback at all". A cross-fade tells the user something changed
 * without moving anything across their field of view, and is usually the right
 * substitute for a slide. `motionPropsFor` below does exactly that swap, and
 * keeps it testable by being a plain function of a boolean.
 */
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { useReducedMotion } from "../useReducedMotion";

export type MotionProps = {
  initial: { opacity: number; y: number };
  animate: { opacity: number; y: number };
  exit: { opacity: number; y: number };
  transition: { duration: number };
};

/**
 * The full version moves 12px and takes 260ms. The reduced version cross-fades
 * in place: `y` stays 0 at every keyframe, so nothing travels.
 */
export function motionPropsFor(reduced: boolean): MotionProps {
  if (reduced) {
    return {
      initial: { opacity: 0, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 0 },
      transition: { duration: 0.12 },
    };
  }

  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.26 },
  };
}

export function Motion() {
  const systemReduced = useReducedMotion();
  const [pretendReduced, setPretendReduced] = useState(false);
  const [items, setItems] = useState(["First note", "Second note"]);

  const reduced = systemReduced || pretendReduced;
  const props = motionPropsFor(reduced);

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => setItems((current) => [...current, `Note ${current.length + 1}`])}>
          Add
        </button>
        <button
          onClick={() => setItems((current) => current.slice(0, -1))}
          disabled={items.length === 0}
        >
          Remove the last
        </button>
      </div>

      <label className="row">
        <input
          type="checkbox"
          checked={pretendReduced}
          onChange={(event) => setPretendReduced(event.target.checked)}
        />
        Simulate reduce motion
      </label>

      <p className="note" data-testid="detected">
        OS setting: {systemReduced ? "reduce" : "no preference"} · in effect:{" "}
        {reduced ? "reduced" : "full"}
      </p>

      {/* AnimatePresence keeps a removed child mounted until its exit
          animation finishes. This is the case CSS cannot cover alone. */}
      <ul className="stack" data-testid="items">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item}
              layout
              initial={props.initial}
              animate={props.animate}
              exit={props.exit}
              transition={props.transition}
              className="panel"
            >
              {item}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <p className="note">
        Tick the box and remove an item. It still fades, so you can see something happened; it no
        longer travels up the page. That is the distinction reduced motion is asking for.
      </p>
    </div>
  );
}
