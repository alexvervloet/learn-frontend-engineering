import { setupServer } from "msw/node";

import { handlers } from "./handlers";
import { realtimeHandlers } from "./realtime";

// Same handlers, no Service Worker. In Node, MSW patches the HTTP layer
// directly, and the ws link intercepts WebSocket connections the same way.
export const server = setupServer(...handlers, ...realtimeHandlers);
