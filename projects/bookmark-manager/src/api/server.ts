import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/** The Node interceptor, for Vitest. */
export const server = setupServer(...handlers);
