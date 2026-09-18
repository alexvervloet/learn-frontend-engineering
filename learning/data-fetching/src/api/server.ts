import { setupServer } from "msw/node";

import { handlers } from "./handlers";

// Same handlers, no Service Worker. In Node, MSW patches the HTTP layer
// directly.
export const server = setupServer(...handlers);
