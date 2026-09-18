// Runs before every test file in every workspace.
//
// jest-dom adds the DOM matchers (toBeInTheDocument, toBeDisabled, …). Testing
// Library's auto-cleanup already runs between tests under Vitest's globals, but
// the explicit afterEach keeps it working if a workspace turns globals off.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
