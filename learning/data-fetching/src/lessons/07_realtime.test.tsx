import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { votes } from "../api/realtime";
import { server } from "../api/server";
import { renderWithClient } from "../test-utils";
import { Realtime, nextDelay, parseSseChunk, splitSseFrames } from "./07_realtime";

describe("the SSE wire format", () => {
  it("parses the ordinary case", () => {
    expect(parseSseChunk('event: vote\ndata: {"id":"1"}\nid: 42')).toEqual({
      event: "vote",
      data: '{"id":"1"}',
      id: "42",
    });
  });

  it("defaults the event name to message", () => {
    // A server that sends only `data:` is sending a `message` event, and a
    // client listening for a named one hears nothing.
    expect(parseSseChunk("data: hello")).toEqual({ event: "message", data: "hello" });
  });

  it("joins repeated data lines with a newline", () => {
    // A JSON payload split across two data: lines is still valid JSON once
    // joined. Taking only the last line gives a syntax error nobody can
    // reproduce, because it depends on the server's buffer size.
    expect(parseSseChunk('data: {"a":1,\ndata: "b":2}')?.data).toBe('{"a":1,\n"b":2}');
  });

  it("strips exactly one leading space, which is part of the format", () => {
    expect(parseSseChunk("data:  two spaces")?.data).toBe(" two spaces");
    expect(parseSseChunk("data:none")?.data).toBe("none");
  });

  it("ignores a comment, which is what a keep-alive is", () => {
    // A proxy closes an idle connection, so servers send `: ping` every
    // fifteen seconds. A parser that treats it as an event delivers an empty
    // message to the app forever.
    expect(parseSseChunk(": ping")).toBeNull();
    expect(parseSseChunk(": ping\ndata: real")?.data).toBe("real");
  });

  it("ignores a field it does not know, as the spec requires", () => {
    // This is what lets a server add a field without breaking old clients.
    expect(parseSseChunk("data: x\nsomethingNew: y")).toEqual({ event: "message", data: "x" });
  });

  it("reads retry as a number", () => {
    expect(parseSseChunk("data: x\nretry: 5000")?.retry).toBe(5000);
    expect(parseSseChunk("data: x\nretry: soon")?.retry).toBeUndefined();
  });
});

describe("splitting a stream into frames", () => {
  it("keeps a partial event in the buffer instead of parsing half of it", () => {
    // The bug this prevents: a chunk boundary in the middle of an event.
    // Parse eagerly and you get `{"id":"1"` through JSON.parse.
    const { frames, rest } = splitSseFrames('data: one\n\ndata: {"half":');

    expect(frames).toEqual(["data: one"]);
    expect(rest).toBe('data: {"half":');
  });

  it("returns nothing and buffers everything when no event is complete", () => {
    const { frames, rest } = splitSseFrames("data: still arri");
    expect(frames).toEqual([]);
    expect(rest).toBe("data: still arri");
  });

  it("handles CRLF, because something between you and the server will rewrite it", () => {
    const { frames } = splitSseFrames("data: one\r\n\r\ndata: two\r\n\r\n");
    expect(frames).toEqual(["data: one", "data: two"]);
  });

  it("drops the empty tail after a complete event", () => {
    const { frames, rest } = splitSseFrames("data: one\n\n");
    expect(frames).toEqual(["data: one"]);
    expect(rest).toBe("");
  });
});

describe("reconnection backoff", () => {
  it("grows exponentially", () => {
    // random() fixed at 1 so the jitter returns the ceiling and the growth is
    // what is being measured.
    const one = () => 1;
    expect(nextDelay({ attempt: 0 }, one)).toBe(500);
    expect(nextDelay({ attempt: 1 }, one)).toBe(1000);
    expect(nextDelay({ attempt: 2 }, one)).toBe(2000);
  });

  it("stops growing at the ceiling", () => {
    // Without a cap, attempt 20 is eleven days.
    expect(nextDelay({ attempt: 20 }, () => 1)).toBe(30_000);
  });

  it("jitters, which is the part that stops a thundering herd", () => {
    // Every client that dropped when the server restarted would otherwise
    // come back at the same millisecond and restart it again.
    expect(nextDelay({ attempt: 3 }, () => 0)).toBe(0);
    expect(nextDelay({ attempt: 3 }, () => 0.5)).toBe(2000);
    expect(nextDelay({ attempt: 3 }, () => 1)).toBe(4000);
  });

  it("treats a negative attempt as the first one", () => {
    expect(nextDelay({ attempt: -5 }, () => 1)).toBe(500);
  });
});

describe("the component, against a real WebSocket", () => {
  /**
   * MSW's `ws` link intercepts the connection, so the component opens a real
   * `WebSocket` to a real URL and nothing about it is stubbed. That is the
   * same argument the module makes for MSW over mocking `fetch`: what runs
   * under test is the code that ships.
   */
  it("connects", async () => {
    renderWithClient(<Realtime />);

    await waitFor(() => {
      expect(screen.getByTestId("ws-status")).toHaveTextContent("open");
    });
  });

  it("puts an incoming vote into the query cache, not into component state", async () => {
    // Hold the connection and send when the test decides to, rather than on
    // connect. Sending on connect races the initial query: the socket opens
    // well before the 300ms fetch resolves.
    // An object rather than a `let`. TypeScript narrows a local assigned only
    // inside a callback to `null` and then refuses the call as `never`,
    // because it cannot see that the callback ran. A property read is
    // re-widened after an intervening call, which is what we want here.
    const connection: { send: ((payload: string) => void) | null } = { send: null };

    server.use(
      votes.addEventListener("connection", ({ client }) => {
        connection.send = (payload: string) => {
          client.send(payload);
        };
      }),
    );

    renderWithClient(<Realtime />);

    // Wait for the query, so there is a cache entry to patch.
    await waitFor(
      () => {
        expect(screen.getByTestId("votes-1")).toHaveTextContent("12");
      },
      { timeout: 3000 },
    );

    expect(connection.send).not.toBeNull();
    connection.send?.(JSON.stringify({ type: "vote", id: "1", votes: 99 }));

    // The list comes from the query, so seeing 99 here means the socket
    // message reached the cache rather than a local array in the component.
    await waitFor(() => {
      expect(screen.getByTestId("votes-1")).toHaveTextContent("99");
    });

    expect(screen.getByTestId("ws-received")).toHaveTextContent("1");
  });

  it("refetches rather than dropping a message that beat the first query", async () => {
    // The race the component's undefined branch exists for. Sending on
    // connect means the message arrives before there is a cache entry, and
    // patching nothing would lose it with no sign at all.
    server.use(
      votes.addEventListener("connection", ({ client }) => {
        client.send(JSON.stringify({ type: "vote", id: "1", votes: 99 }));
      }),
    );

    renderWithClient(<Realtime />);

    await waitFor(
      () => {
        expect(screen.getByTestId("votes-1")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Counted, so the message was handled rather than ignored. The number on
    // screen comes from the refetch it triggered, which is the server's
    // truth rather than the socket's guess.
    expect(screen.getByTestId("ws-received")).toHaveTextContent("1");
  });

  it("ignores a message that is not a vote", async () => {
    // The default handler sends `{"type":"hello"}` on connect. A client that
    // assumes the first message is data would count it.
    renderWithClient(<Realtime />);

    await waitFor(() => {
      expect(screen.getByTestId("ws-status")).toHaveTextContent("open");
    });

    expect(screen.getByTestId("ws-received")).toHaveTextContent("0");
  });

  it("closes the socket on unmount", async () => {
    // Registered before the component connects, or there is no connection
    // event left to attach to.
    let closed = false;
    server.use(
      votes.addEventListener("connection", ({ client }) => {
        client.addEventListener("close", () => {
          closed = true;
        });
      }),
    );

    const { unmount } = renderWithClient(<Realtime />);

    await waitFor(() => {
      expect(screen.getByTestId("ws-status")).toHaveTextContent("open");
    });
    expect(closed).toBe(false);

    unmount();

    // A socket left open holds this component's closures, and in a router it
    // accumulates one per visit. The first draft of this test asserted
    // `closed || true`, which is true whatever the component does.
    await waitFor(() => {
      expect(closed).toBe(true);
    });
  });
});
