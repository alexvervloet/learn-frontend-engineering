/**
 * A mock WebSocket endpoint, on the same footing as the HTTP handlers.
 *
 * MSW's `ws` link intercepts WebSocket connections the same way `http`
 * intercepts requests, so a component under test opens a real `WebSocket` to a
 * real URL and this answers it. No injected fake socket, no interface the
 * component only has in tests.
 */
import { ws } from "msw";

export const votes = ws.link("ws://localhost/live");

export type VoteMessage = { type: "vote"; id: string; votes: number };

export function encodeVote(message: VoteMessage): string {
  return JSON.stringify(message);
}

export const realtimeHandlers = [
  votes.addEventListener("connection", ({ client }) => {
    // A server that says hello. Real ones usually do, and a client that
    // assumes the first message is data rather than a handshake is a common
    // bug.
    client.send(JSON.stringify({ type: "hello" }));
  }),
];
