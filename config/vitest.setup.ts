// Runs before every test file in every workspace.
//
// jest-dom adds the DOM matchers (toBeInTheDocument, toBeDisabled, …). Testing
// Library's auto-cleanup already runs between tests under Vitest's globals, but
// the explicit afterEach keeps it working if a workspace turns globals off.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/*
 * jsdom implements the DOM, not the whole browser. These three are absent, and
 * a component using one throws "X is not defined" in a test while working
 * perfectly in a browser.
 *
 * They are stubs, not implementations. jsdom does no layout and has no
 * viewport, so there are no size changes, intersections or media-query matches
 * to report, and pretending otherwise would be worse than not having them: a
 * fake that returns plausible numbers lets a test assert something no browser
 * would ever do. These exist so a component can mount. Anything that depends on
 * a real measurement belongs in a Playwright test.
 *
 * A test that needs different behaviour overrides one locally, which is what
 * the reduced-motion lesson in `learning/styling` does with matchMedia.
 */
class ResizeObserverStub implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

// Nothing matches, because there is no viewport and no OS preference. A test
// about a media query has to say what it wants; see matchMediaStub in
// learning/styling.
vi.stubGlobal("matchMedia", (query: string): MediaQueryList => {
  const list: MediaQueryList = {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  };
  return list;
});

afterEach(() => {
  cleanup();
});
