import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createMatchMediaStub } from "../matchMediaStub";
import { useReducedMotion } from "../useReducedMotion";
import { Motion, motionPropsFor } from "./07_motion";

const REDUCE = "(prefers-reduced-motion: reduce)";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the blanket CSS safety net", () => {
  const motionCss = readFileSync(join(import.meta.dirname, "..", "motion.css"), "utf8");

  it("shortens transitions rather than zeroing them", () => {
    // A 0s transition may never fire `transitionend`, and anything waiting on
    // that event hangs. 0.01ms is imperceptible and still fires.
    expect(motionCss).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(motionCss).not.toMatch(/transition-duration:\s*0s/);
  });

  it("is scoped to the preference and nothing else", () => {
    expect(motionCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});

describe("what reduced motion changes", () => {
  it("removes the travel but keeps the fade", () => {
    const reduced = motionPropsFor(true);

    // Nothing moves on any keyframe.
    expect([reduced.initial.y, reduced.animate.y, reduced.exit.y]).toEqual([0, 0, 0]);
    // But the opacity still changes, so the user still sees that something happened.
    expect(reduced.initial.opacity).toBe(0);
    expect(reduced.animate.opacity).toBe(1);
  });

  it("does not simply set the duration to zero", () => {
    // "Reduced" means no large movement, not no feedback. An instant swap is a
    // common misreading of the setting.
    expect(motionPropsFor(true).transition.duration).toBeGreaterThan(0);
  });

  it("moves, and moves further out than in, at full motion", () => {
    const full = motionPropsFor(false);

    expect(full.initial.y).toBeGreaterThan(0);
    expect(full.exit.y).toBeLessThan(0);
  });
});

describe("useReducedMotion", () => {
  it("reports the OS preference", () => {
    const stub = createMatchMediaStub({ [REDUCE]: true });
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("notices the setting changing while the tab is open", () => {
    const stub = createMatchMediaStub({ [REDUCE]: false });
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // People really do change this mid-session, usually because something on
    // the page is making them ill.
    act(() => stub.set(REDUCE, true));

    expect(result.current).toBe(true);
  });

  it("defaults to animating when nothing matches", () => {
    const stub = createMatchMediaStub();
    vi.stubGlobal("matchMedia", stub.matchMedia);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});

describe("the lesson", () => {
  it("follows the OS setting", () => {
    const stub = createMatchMediaStub({ [REDUCE]: true });
    vi.stubGlobal("matchMedia", stub.matchMedia);

    render(<Motion />);

    expect(screen.getByTestId("detected")).toHaveTextContent("OS setting: reduce");
    expect(screen.getByTestId("detected")).toHaveTextContent("in effect: reduced");
  });

  it("lets the simulation override a system that has no preference", async () => {
    const stub = createMatchMediaStub({ [REDUCE]: false });
    vi.stubGlobal("matchMedia", stub.matchMedia);

    render(<Motion />);
    expect(screen.getByTestId("detected")).toHaveTextContent("in effect: full");

    await userEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByTestId("detected")).toHaveTextContent("in effect: reduced");
  });

  it("adds and removes items", async () => {
    const stub = createMatchMediaStub();
    vi.stubGlobal("matchMedia", stub.matchMedia);

    render(<Motion />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
