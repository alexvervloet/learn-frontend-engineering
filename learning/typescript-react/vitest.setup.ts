/**
 * jsdom implements the DOM, not the whole browser. Several observer APIs are
 * simply absent, and a component using one throws "ResizeObserver is not
 * defined" in a test while working perfectly in a browser.
 *
 * A stub is the honest fix. It is not a fake implementation: it records nothing
 * and fires no callbacks, because jsdom does no layout, so there are no size
 * changes to report. It exists so the component can mount. Anything that needs
 * a real measurement belongs in a Playwright test against a real browser.
 */
import { vi } from "vitest";

class ResizeObserverStub implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
