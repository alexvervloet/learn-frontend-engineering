/**
 * useEffectEvent: the value an effect reads but must not react to
 * ===============================================================
 * Lesson 05 says the dependency array is the list of values the effect reads,
 * and that silencing the lint rule is almost never the fix. Both are still
 * true. This lesson is about the case they do not cover, which is common
 * enough that React shipped a hook for it.
 *
 * An effect often does two things at once. Part of it is *reactive*: change
 * the room and the connection has to be torn down and rebuilt. Part of it is
 * not: when the connection opens, tell the user, in whatever theme they are
 * using at that moment.
 *
 *   useEffect(() => {
 *     const connection = connect(roomId);
 *     showToast(`Connected to ${roomId}`, theme);   // reads theme
 *     return () => connection.close();
 *   }, [roomId, theme]);                            // so theme goes here
 *
 * The array is now honest and the behaviour is wrong. Switching from light to
 * dark drops a working socket and opens a new one, because the linter is
 * right that the effect reads `theme` and has no way to know the effect does
 * not *depend* on it.
 *
 * **The three things people used to do, and what each cost.**
 *
 *   leave theme out          the lint rule shouts, and rightly: the effect
 *                            now closes over a stale theme forever
 *   silence the lint rule    the same bug, with the warning turned off
 *   a ref, synced in its own
 *   effect                   correct, and about eight lines of ceremony that
 *                            every reader has to decode
 *
 * **`useEffectEvent` is the fourth.** It splits the effect into the reactive
 * part and the part that merely reads:
 *
 *   const onConnected = useEffectEvent((room) => showToast(`Connected to ${room}`, theme));
 *
 *   useEffect(() => {
 *     const connection = connect(roomId);
 *     onConnected(roomId);
 *     return () => connection.close();
 *   }, [roomId]);
 *
 * `theme` is read inside the event, so the event always sees the latest one.
 * It is not a dependency, so changing it does not reconnect. The array says
 * what it means again: this effect is about the room.
 *
 * **The rules, and they are enforced.**
 *
 *   declare it in the component body, like any other hook
 *   call it only from inside an effect, or from a function defined in one
 *   never put it in a dependency array
 *   never pass it to another component or store it anywhere
 *
 * The last two are the same rule really. An effect event is not a value with
 * a stable identity that you may pass around; it is a hole in one effect,
 * and it is only meaningful next to the effect it belongs to.
 *
 * **It is not a way to shorten dependency arrays.** If changing a value
 * *should* re-run the effect, it belongs in the array. Reach for this only
 * when you can say out loud why the effect reads the value without depending
 * on it. "I read the theme at the moment I connect" is such a sentence.
 * "I could not get the lint rule to stop complaining" is not.
 *
 * The two panels below are the same component twice, one dependency apart.
 * Change the theme and watch the connection count on the left climb. Then
 * change the room and read the right-hand panel: it names the theme you just
 * picked, which it never declared and never re-ran for.
 *
 * Both panels write their status straight to a DOM node rather than to state.
 * An effect writing to the outside world is what effects are for, and it
 * keeps the connection count out of the render path, where counting it would
 * be the impurity lesson 04 is about.
 */
import { useEffect, useEffectEvent, useRef, useState } from "react";

type Theme = "light" | "dark";

const ROOMS = ["general", "travel", "music"] as const;

/** What both panels do on connect. Writes to the DOM, not to state. */
function announce(node: HTMLElement | null, room: string, theme: Theme, count: number): void {
  if (node === null) return;
  node.textContent = `connection #${count} · room "${room}" · announced in ${theme}`;
}

/**
 * The honest dependency array, and the reconnection it buys.
 *
 * Nothing here is a mistake. The effect really does read `theme`, so `theme`
 * really does belong in the array, and the result is still wrong.
 */
function ThemeInTheDeps({ room, theme }: { room: string; theme: Theme }) {
  const output = useRef<HTMLParagraphElement>(null);
  const connections = useRef(0);

  useEffect(() => {
    connections.current += 1;
    announce(output.current, room, theme, connections.current);

    // A real one closes a socket here. The count is the point: every
    // increment is a connection that was torn down and rebuilt.
    return () => {};
  }, [room, theme]);

  return <p data-testid="reactive-output" ref={output} className="log" />;
}

/** The same effect, with the part that only reads moved out of the array. */
function ThemeBehindAnEvent({ room, theme }: { room: string; theme: Theme }) {
  const output = useRef<HTMLParagraphElement>(null);
  const connections = useRef(0);

  // `theme` is read in here, so this always sees the current one. It is not a
  // dependency of the effect below, so changing it reconnects nothing.
  const onConnected = useEffectEvent((connectedTo: string) => {
    connections.current += 1;
    announce(output.current, connectedTo, theme, connections.current);
  });

  useEffect(() => {
    onConnected(room);
    return () => {};
    // `onConnected` is deliberately absent, and this is the one dependency
    // the linter wants you to leave out. Add it and you get:
    //
    //   Functions returned from `useEffectEvent` must not be included in the
    //   dependency array. Remove `onConnected` from the list
    //
    // It arrives as a warning rather than an error, which is why this repo
    // runs CI with `--max-warnings 0`.
  }, [room]);

  return <p data-testid="event-output" ref={output} className="log" />;
}

export function EffectEvents() {
  const [room, setRoom] = useState<string>(ROOMS[0]);
  const [theme, setTheme] = useState<Theme>("light");

  return (
    <div className="stack">
      <div className="row">
        <span>room:</span>
        {ROOMS.map((option) => (
          <button key={option} onClick={() => setRoom(option)} aria-pressed={room === option}>
            {option}
          </button>
        ))}
      </div>

      <div className="row">
        <span>theme:</span>
        <button
          onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
          data-testid="toggle-theme"
        >
          switch to {theme === "light" ? "dark" : "light"}
        </button>
      </div>

      <div className="stack">
        <h3>
          <code>[room, theme]</code>
        </h3>
        <ThemeInTheDeps room={room} theme={theme} />
      </div>

      <div className="stack">
        <h3>
          <code>[room]</code>, with the announcement behind an effect event
        </h3>
        <ThemeBehindAnEvent room={room} theme={theme} />
      </div>

      <p className="note">
        Press <strong>switch to dark</strong> a few times. The first panel reconnects on every
        press; the second does not move. Now change the room: the second panel names the theme you
        picked, which it reads and never re-runs for.
      </p>
      <p className="note">
        In the browser these counts start at 2, not 1. StrictMode mounts every component twice in
        development on purpose, and an effect that cleans up properly does not care. The tests run
        without it and see the real numbers.
      </p>
    </div>
  );
}
