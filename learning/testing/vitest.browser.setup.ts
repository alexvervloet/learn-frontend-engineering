/**
 * The browser-mode setup, and it is deliberately almost empty.
 *
 * `config/vitest.setup.ts` stubs ResizeObserver, IntersectionObserver and
 * matchMedia because jsdom has none of them. Loading it here would replace the
 * real implementations with no-ops and defeat the entire point of running in a
 * browser, so this file loads the matchers and nothing else.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
