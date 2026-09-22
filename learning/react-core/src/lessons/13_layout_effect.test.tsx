import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useLayoutEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { LayoutEffects, recordPhases } from "./13_layout_effect";

/**
 * What can and cannot be asserted here, stated up front because it decides
 * the shape of every test below.
 *
 * jsdom does no layout. Every element is 0 pixels wide, `offsetWidth` is 0,
 * and nothing is ever painted, so "the user did not see the intermediate
 * state" is not a claim this environment can settle. A test that pretended
 * otherwise would be asserting jsdom's behaviour, not React's.
 *
 * What is decidable is ordering, and ordering is the actual mechanism: a
 * layout effect runs before the paint *because* React runs it synchronously
 * during the commit, ahead of the effects it defers. Assert that, and the
 * visual claim follows from it.
 */
describe("when each hook runs", () => {
  it("runs the layout effect before the passive effect", () => {
    const { phases, Probe } = recordPhases();

    render(<Probe />);

    expect(phases).toEqual(["render", "layout-effect", "effect"]);
  });

  /**
   * A layout effect that sets state, in full, including the step I had wrong.
   *
   * I expected the re-render caused by the layout effect to come before the
   * first commit's passive effect, on the reasoning that React finishes the
   * synchronous work before releasing the frame. It does, but the passive
   * effect is part of that work: React flushes any pending passive effects
   * before it begins a new render pass, so the effect from commit one runs
   * with the *old* value, in the middle, and only then does the re-render
   * happen.
   *
   * So a passive effect is not "after the paint" in the sense of always being
   * last. It is "after the commit it was queued in, and before whatever
   * renders next". Here nothing paints between any of these, because the
   * layout effect's update is flushed synchronously.
   *
   * What jsdom cannot settle is the paint itself, so that is not asserted
   * anywhere in this file. The ordering is the mechanism; the flash is the
   * consequence.
   */
  it("flushes the pending passive effect before the re-render it caused", () => {
    const order: string[] = [];

    function Subject() {
      const [measured, setMeasured] = useState(false);

      useLayoutEffect(() => {
        order.push("layout-effect");
        if (!measured) setMeasured(true);
      }, [measured]);

      useEffect(() => {
        order.push(`effect (measured=${String(measured)})`);
      }, [measured]);

      order.push(`render (measured=${String(measured)})`);
      return <p>{String(measured)}</p>;
    }

    render(<Subject />);

    expect(order).toEqual([
      "render (measured=false)",
      "layout-effect",
      // Queued by the first commit, flushed here because React empties the
      // passive queue before starting the render the layout effect asked for.
      // It sees the old value, which is the part worth staring at.
      "effect (measured=false)",
      "render (measured=true)",
      "layout-effect",
      "effect (measured=true)",
    ]);
  });

  /**
   * And the contrast, which is the bug the hook exists to prevent.
   *
   * The same component with `useEffect` in place of `useLayoutEffect` lets a
   * render with the pre-measurement value reach the end of the commit before
   * anything corrects it. In a browser that render is a paint, and the paint
   * is the flash.
   */
  it("lets the unmeasured render settle first when it is a passive effect", () => {
    const order: string[] = [];

    function Subject() {
      const [measured, setMeasured] = useState(false);

      useEffect(() => {
        order.push("effect");
        if (!measured) setMeasured(true);
      }, [measured]);

      order.push(`render (measured=${String(measured)})`);
      return <p>{String(measured)}</p>;
    }

    render(<Subject />);

    // "render false" is complete and committed before anything measures. That
    // gap is where the browser paints.
    expect(order[0]).toBe("render (measured=false)");
    expect(order[1]).toBe("effect");
    expect(order).toContain("render (measured=true)");
  });
});

describe("the demo", () => {
  it("has a measurement by the time the first render is on screen", () => {
    render(<LayoutEffects />);

    // jsdom reports 0, not 120, because it does no layout. The claim being
    // asserted is that the value is present rather than "not yet", which is
    // what it would read if the measurement were still pending.
    expect(screen.getByTestId("measured")).not.toHaveTextContent("not yet");
  });

  it("re-measures when the thing it measured changes", async () => {
    render(<LayoutEffects />);

    await userEvent.click(screen.getByRole("button", { name: "320px" }));

    expect(screen.getByTestId("box")).toHaveStyle({ width: "320px" });
    expect(screen.getByRole("button", { name: "320px" })).toHaveAttribute("aria-pressed", "true");
  });
});
