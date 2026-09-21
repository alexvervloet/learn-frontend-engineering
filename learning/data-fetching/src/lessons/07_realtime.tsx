/**
 * Real time: polling, SSE, and WebSockets
 * =======================================
 * Everything so far has been request/response: you ask, the server answers,
 * the exchange is over. Real time inverts it, and the first decision is which
 * of the three you actually need.
 *
 *   polling      `refetchInterval` on a query. One line, works everywhere,
 *                survives proxies and load balancers that mangle anything
 *                long-lived, and costs a request per interval per client.
 *   SSE          `EventSource`. Server to client only, over plain HTTP, and
 *                the browser reconnects for you. The right answer for a feed,
 *                a progress stream or a notification channel.
 *   WebSocket    Full duplex. Needed when the client sends too, at a rate
 *                that would be silly as HTTP requests: a cursor position, a
 *                chat box, a collaborative document.
 *
 * **Start with polling.** A five-second `refetchInterval` is not a compromise
 * for most dashboards; it is the correct amount of engineering. Reach past it
 * when the latency requirement is genuinely sub-second or the update rate
 * makes polling wasteful.
 *
 * **SSE is underrated and its wire format is trivial.**
 *
 *     event: vote
 *     data: {"id":"1","votes":13}
 *     id: 42
 *     <blank line ends the event>
 *
 * That is the whole protocol. The blank line is the delimiter, `data:` can
 * repeat and the lines join with newlines, and the browser sends the last `id`
 * back as `Last-Event-ID` when it reconnects, so a server can replay what you
 * missed. `parseSseChunk` below implements it, because the parsing is where
 * the bugs are and it is pure string work.
 *
 * The catch: `EventSource` cannot send headers, so it cannot carry a bearer
 * token. Cookie auth, or a token in the query string, or `fetch` with a
 * `ReadableStream` and parsing it yourself.
 *
 * **WebSockets need reconnection logic and you have to write it.** The socket
 * closes: a deploy, a proxy timeout, a laptop lid. `nextDelay` below is
 * exponential backoff with jitter, and the jitter is not decoration. Without
 * it every client that dropped when the server restarted reconnects at the
 * same instant and knocks it over again.
 *
 * **The message is not the state.** The common mistake is keeping a list in
 * component state and appending each message to it. Then a reconnect leaves a
 * gap, and nothing tells you. Treat the socket as an invalidation signal and
 * let the cache be the source of truth: a message arrives, you update the
 * cache entry, and a refetch after reconnect repairs whatever was missed.
 * That is what this lesson does with `queryClient.setQueryData`.
 *
 * jsdom has `WebSocket` and no `EventSource`, so the socket half runs against
 * MSW's `ws` link in the tests and the SSE half is tested at the parser.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { listBookmarks } from "../api/client";
import type { Bookmark } from "../api/db";

/* ------------------------------------------------------------------ *
 * SSE: the wire format
 * ------------------------------------------------------------------ */

export type SseEvent = { event: string; data: string; id?: string; retry?: number };

/**
 * Parses one SSE frame: the text between two blank lines.
 *
 * Returns null for a frame with no `data`, which is how keep-alive comments
 * arrive. A server sends `: ping` every 15 seconds or so to stop a proxy
 * closing an idle connection, and a parser that treats that as an event
 * delivers an empty message to your app every 15 seconds forever.
 */
export function parseSseChunk(chunk: string): SseEvent | null {
  const lines = chunk.split("\n");
  const data: string[] = [];
  let event = "message";
  let id: string | undefined;
  let retry: number | undefined;

  for (const line of lines) {
    // A line starting with ":" is a comment. Keep-alives are usually exactly
    // that and nothing else.
    if (line.startsWith(":")) continue;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    // One optional space after the colon is part of the format, not the value.
    const rawValue = colon === -1 ? "" : line.slice(colon + 1);
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;

    if (field === "data") data.push(value);
    else if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "retry") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) retry = parsed;
    }
    // Any other field name is ignored by the spec, deliberately, so a server
    // can add one without breaking old clients.
  }

  if (data.length === 0) return null;

  // Repeated data: lines join with "\n". A JSON payload split across two of
  // them is still valid JSON once joined, and a parser that takes only the
  // last line produces a syntax error nobody can reproduce.
  return {
    event,
    data: data.join("\n"),
    ...(id === undefined ? {} : { id }),
    ...(retry === undefined ? {} : { retry }),
  };
}

/** Splits a stream buffer into complete frames, leaving the partial tail behind. */
export function splitSseFrames(buffer: string): { frames: string[]; rest: string } {
  // Normalise CRLF first: the spec allows \r\n, \n and \r as line endings, and
  // a server behind a proxy that rewrites them is not hypothetical.
  const normalised = buffer.replace(/\r\n|\r/g, "\n");
  const parts = normalised.split("\n\n");
  // The last part is whatever arrived after the final blank line, which may
  // be half an event. Keeping it is the entire job of this function.
  const rest = parts.pop() ?? "";
  return { frames: parts.filter((part) => part.trim() !== ""), rest };
}

/* ------------------------------------------------------------------ *
 * Reconnection
 * ------------------------------------------------------------------ */

export type BackoffOptions = { attempt: number; baseMs?: number; maxMs?: number; jitter?: number };

/**
 * Exponential backoff with full jitter.
 *
 * The jitter is the part people leave out and the part that matters. Without
 * it, every client that dropped when the server restarted comes back at
 * exactly the same moment and restarts it again. `random` is injected so the
 * test can be deterministic about a function whose whole point is randomness.
 */
export function nextDelay(
  { attempt, baseMs = 500, maxMs = 30_000 }: BackoffOptions,
  random: () => number = Math.random,
): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  // Full jitter: anywhere in [0, exponential], not exponential ± a bit.
  return Math.round(random() * exponential);
}

/* ------------------------------------------------------------------ *
 * The component
 * ------------------------------------------------------------------ */

type Status = "connecting" | "open" | "closed";

export function Realtime() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("connecting");
  const [received, setReceived] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  const { data } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks", null],
    queryFn: () => listBookmarks(null),
  });

  useEffect(() => {
    const socket = new WebSocket("ws://localhost/live");
    socketRef.current = socket;

    const onOpen = (): void => setStatus("open");
    const onClose = (): void => setStatus("closed");

    const onMessage = (event: MessageEvent<string>): void => {
      const message = JSON.parse(event.data) as { type: string; id?: string; votes?: number };
      if (message.type !== "vote" || message.id === undefined) return;

      setReceived((count) => count + 1);

      // The cache is the state, not a list in this component. A reconnect
      // refetches and repairs anything missed; an append-only array in
      // useState silently keeps the gap.
      //
      // The `undefined` branch is a race worth knowing about. The socket can
      // open and deliver before the first query resolves, and patching a
      // cache entry that is not there writes nothing, after which the
      // in-flight response lands and the message is simply lost. So patch
      // when there is something to patch and otherwise ask for a refetch,
      // which is the same "treat it as an invalidation signal" rule stated at
      // the top of the file.
      const existing = queryClient.getQueryData<Bookmark[]>(["bookmarks", null]);

      if (existing === undefined) {
        void queryClient.invalidateQueries({ queryKey: ["bookmarks", null] });
        return;
      }

      queryClient.setQueryData<Bookmark[]>(["bookmarks", null], (current) =>
        (current ?? []).map((bookmark) =>
          bookmark.id === message.id
            ? { ...bookmark, votes: message.votes ?? bookmark.votes }
            : bookmark,
        ),
      );
    };

    socket.addEventListener("open", onOpen);
    socket.addEventListener("close", onClose);
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("open", onOpen);
      socket.removeEventListener("close", onClose);
      socket.removeEventListener("message", onMessage);
      // Closing on unmount is not optional. A socket left open holds this
      // component's closures, and in a router it accumulates one per visit.
      socket.close();
    };
  }, [queryClient]);

  return (
    <div className="stack">
      <p className="note">
        status: <strong data-testid="ws-status">{status}</strong> · messages applied:{" "}
        <strong data-testid="ws-received">{received}</strong>
      </p>

      <ul data-testid="live-list">
        {(data ?? []).map((bookmark) => (
          <li key={bookmark.id}>
            {bookmark.title} — <span data-testid={`votes-${bookmark.id}`}>{bookmark.votes}</span>
          </li>
        ))}
      </ul>

      <p className="note">
        Every vote arrives on the socket and goes into the query cache, not into this component.
        That is what makes a reconnect able to repair itself.
      </p>
    </div>
  );
}
