import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ViewTransitions,
  supportsViewTransitions,
  withViewTransition,
} from "./06_view_transitions";

const cssWithComments = readFileSync(
  join(import.meta.dirname, "..", "viewTransitions.css"),
  "utf8",
);

/**
 * Comments stripped before any assertion runs.
 *
 * The first version of the "no blanket rule" test below failed against a
 * comment that quotes the very rule it is checking for. Asserting on prose is
 * how a structural test turns into a test of the wording.
 */
const css = cssWithComments.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * jsdom has no `startViewTransition`, no `::view-transition-*` pseudo-elements
 * and no way to observe an animation. So the split:
 *
 *   here       the fallback path runs the update, the promise still settles,
 *              a skipped transition does not become an unhandled rejection,
 *              and the stylesheet declares what the lesson claims
 *   Chromium   the transition actually runs, and a duplicated name skips it
 *
 * The browser half is `learning/testing/e2e/view-transitions.spec.ts`.
 */
afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "startViewTransition");
});

/** A fake that records the callback and lets the test settle the promises. */
function stubViewTransitions({ skip = false } = {}) {
  const calls: (() => void)[] = [];

  Object.defineProperty(document, "startViewTransition", {
    configurable: true,
    writable: true,
    value: (update: () => void) => {
      calls.push(update);
      update();
      return {
        updateCallbackDone: Promise.resolve(),
        // A skipped transition rejects `ready`. The demo of that is a
        // duplicated view-transition-name, which happens constantly.
        ready: skip ? Promise.reject(new Error("skipped")) : Promise.resolve(),
        finished: skip ? Promise.reject(new Error("skipped")) : Promise.resolve(),
        skipTransition: () => undefined,
      };
    },
  });

  return calls;
}

describe("feature detection", () => {
  it("is false in jsdom, which has none of this", () => {
    expect(supportsViewTransitions()).toBe(false);
  });

  it("is true once the API is present", () => {
    stubViewTransitions();
    expect(supportsViewTransitions()).toBe(true);
  });
});

describe("withViewTransition", () => {
  it("still applies the update where the API is missing", async () => {
    // The required behaviour in Firefox and older Safari: no animation, same
    // result. A component that only updates inside the callback would simply
    // stop working there.
    let applied = false;
    await withViewTransition(() => {
      applied = true;
    });

    expect(applied).toBe(true);
  });

  it("resolves rather than hanging where the API is missing", async () => {
    await expect(withViewTransition(() => undefined)).resolves.toBeUndefined();
  });

  it("hands the update to the browser where the API is present", async () => {
    const calls = stubViewTransitions();

    let applied = false;
    await withViewTransition(() => {
      applied = true;
    });

    expect(calls).toHaveLength(1);
    expect(applied).toBe(true);
  });

  it("does not turn a skipped transition into an unhandled rejection", async () => {
    // `ready` and `finished` reject when the transition is skipped, and a
    // duplicated view-transition-name skips it. Without the catch this is a
    // stray rejection on a path that is otherwise working correctly.
    stubViewTransitions({ skip: true });

    await expect(withViewTransition(() => undefined)).resolves.toBeUndefined();
  });
});

describe("the component", () => {
  it("says whether the browser supports it", () => {
    render(<ViewTransitions />);
    expect(screen.getByTestId("vt-support")).toHaveTextContent("startViewTransition: no");
  });

  it("toggles the panel with no view transition API at all", async () => {
    const user = userEvent.setup();
    render(<ViewTransitions />);

    expect(screen.getByTestId("vt-panel")).toHaveTextContent("Collapsed.");
    await user.click(screen.getByTestId("vt-toggle"));

    await waitFor(() => {
      expect(screen.getByTestId("vt-panel")).toHaveTextContent("Expanded.");
    });
  });

  it("gives exactly one element the shared name to begin with", () => {
    // The rule the whole feature rests on. Two elements with one name abort
    // the transition silently, so counting them is the check.
    const { container } = render(<ViewTransitions />);

    const named = container.querySelectorAll('[style*="view-transition-name: card"]');
    expect(named).toHaveLength(1);
  });

  it("names only the link being navigated to, not every link", () => {
    // useViewTransitionState is false for all of them until a navigation
    // starts, so at rest every row is `none`. A CSS rule naming .vt-card
    // would name three elements at once and nothing would ever animate.
    render(<ViewTransitions />);

    for (const id of ["kingfisher", "wren", "swift"]) {
      expect(screen.getByTestId(`link-${id}`)).toHaveStyle({ viewTransitionName: "none" });
      expect(screen.getByTestId(`link-${id}`)).toHaveAttribute("data-transitioning", "false");
    }
  });

  it("navigates to the detail and reads the id from the router, not the URL bar", async () => {
    // MemoryRouter keeps history in an array and never touches
    // window.location, so a component reading window.location.pathname here
    // would show the same bird forever.
    const user = userEvent.setup();
    render(<ViewTransitions />);

    await user.click(screen.getByTestId("link-swift"));

    expect(await screen.findByTestId("detail-name")).toHaveTextContent("Swift");

    await user.click(screen.getByTestId("back"));
    expect(await screen.findByTestId("item-list")).toBeInTheDocument();
  });
});

describe("the stylesheet", () => {
  it("targets the shared name's pseudo-elements", () => {
    expect(css).toMatch(/::view-transition-old\(card\)/);
    expect(css).toMatch(/::view-transition-new\(card\)/);
  });

  it("honours prefers-reduced-motion", () => {
    // A view transition is full-screen motion, which is the kind that causes
    // trouble. Leaving the default in place is not an option.
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css);

    expect(block).not.toBeNull();
    expect(block?.[1]).toMatch(/::view-transition-group\(\*\)/);
    expect(block?.[1]).toMatch(/animation-duration:\s*1ms/);
  });

  it("does not name every card in a rule, which would abort every transition", () => {
    // The name is applied per element in the component. A blanket
    // `.vt-card { view-transition-name: card }` here is the bug this asserts
    // against, and it is the easiest one in the world to reintroduce.
    expect(css).not.toMatch(/\.vt-card\s*\{[^}]*view-transition-name/);
  });
});
