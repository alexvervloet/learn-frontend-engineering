import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EffectEvents } from "./12_effect_events";

const reactive = () => screen.getByTestId("reactive-output").textContent ?? "";
const behindEvent = () => screen.getByTestId("event-output").textContent ?? "";

const connectionCount = (text: string): number => Number(/connection #(\d+)/.exec(text)?.[1] ?? 0);

async function switchTheme(): Promise<void> {
  await userEvent.click(screen.getByTestId("toggle-theme"));
}

async function enterRoom(name: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name }));
}

describe("a value the effect reads but must not react to", () => {
  it("reconnects on a theme change when the theme is in the array", async () => {
    render(<EffectEvents />);
    expect(connectionCount(reactive())).toBe(1);

    await switchTheme();
    await switchTheme();

    // Nothing about this is a mistake in the code. The effect really does read
    // `theme`, so the linter is right that it belongs in the array, and the
    // socket still got dropped twice for a colour change.
    expect(connectionCount(reactive())).toBe(3);
  });

  it("does not reconnect when the read is behind an effect event", async () => {
    render(<EffectEvents />);
    expect(connectionCount(behindEvent())).toBe(1);

    await switchTheme();
    await switchTheme();

    expect(connectionCount(behindEvent())).toBe(1);
  });

  it("still reconnects for the value it does depend on", async () => {
    render(<EffectEvents />);

    await enterRoom("travel");

    // The point is not "fewer effects". The room is reactive and stays
    // reactive; only the announcement moved out of the array.
    expect(connectionCount(behindEvent())).toBe(2);
    expect(behindEvent()).toContain('room "travel"');
  });

  /**
   * The assertion the whole hook exists for.
   *
   * The theme is changed first, so the effect event has never run with the new
   * value and the effect has not re-run at all. Then the room changes, the
   * effect runs, and the event reads a theme it never declared as a dependency
   * and never re-rendered for. That is "reads the latest, reacts to nothing".
   */
  it("sees the newest value of the thing it never declared", async () => {
    render(<EffectEvents />);
    expect(behindEvent()).toContain("announced in light");

    await switchTheme();
    expect(behindEvent()).toContain("announced in light"); // not re-run yet

    await enterRoom("music");

    expect(behindEvent()).toContain("announced in dark");
    expect(behindEvent()).toContain('room "music"');
  });

  it("is the only difference between the two panels", async () => {
    render(<EffectEvents />);

    await switchTheme();
    await enterRoom("travel");

    // Same props, same renders, one dependency apart.
    expect(connectionCount(reactive())).toBeGreaterThan(connectionCount(behindEvent()));
  });
});
