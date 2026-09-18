// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, …) are installed at
// runtime by config/vitest.setup.ts. This file is what tells TypeScript about
// them: the /vitest subpath carries the declaration that augments Vitest's
// Assertion interface.
//
// Every workspace's tsconfig lists this file in `include`, because a type-only
// side effect has to be part of the program to apply.
import "@testing-library/jest-dom/vitest";
