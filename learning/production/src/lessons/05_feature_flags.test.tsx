import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { bucket, isEnabled, resolveFlags, type Flag } from "../lib/flags";
import { FeatureFlags } from "./05_feature_flags";

const FLAG: Flag = { key: "new-checkout", rollout: 10, fallback: false };

describe("bucketing", () => {
  it("gives the same user the same bucket every time", () => {
    const first = bucket("new-checkout", "user_1");

    for (let i = 0; i < 100; i += 1) {
      expect(bucket("new-checkout", "user_1")).toBe(first);
    }
  });

  it("gives different flags different buckets for the same user", () => {
    // Otherwise the same unlucky users get every half-finished feature.
    const buckets = ["a", "b", "c", "d"].map((key) => bucket(key, "user_1"));

    expect(new Set(buckets).size).toBeGreaterThan(1);
  });

  it("spreads users roughly evenly", () => {
    const users = Array.from({ length: 10_000 }, (_, i) => `user_${i}`);
    const enabled = users.filter((id) => isEnabled(FLAG, id)).length;

    // 10% rollout over 10,000 users. Within a couple of points is fine; a
    // hash that clusters would show up as a wildly wrong number here.
    expect(enabled / users.length).toBeGreaterThan(0.08);
    expect(enabled / users.length).toBeLessThan(0.12);
  });

  it("treats 0 and 100 as absolute, with no hashing involved", () => {
    const off: Flag = { key: "x", rollout: 0, fallback: true };
    const on: Flag = { key: "x", rollout: 100, fallback: false };

    for (const id of ["a", "b", "c"]) {
      expect(isEnabled(off, id)).toBe(false);
      expect(isEnabled(on, id)).toBe(true);
    }
  });

  it("only ever adds users as the rollout grows", () => {
    // Someone in the 10% must still be in the 20%, or people lose a feature
    // they already had when you widen the rollout.
    const users = Array.from({ length: 500 }, (_, i) => `user_${i}`);
    const at10 = new Set(users.filter((id) => isEnabled({ ...FLAG, rollout: 10 }, id)));
    const at20 = users.filter((id) => isEnabled({ ...FLAG, rollout: 20 }, id));

    for (const id of at10) expect(at20).toContain(id);
  });
});

describe("when the service is down", () => {
  const flags: Flag[] = [
    { key: "kill-switch", rollout: 100, fallback: true },
    { key: "risky-new-path", rollout: 50, fallback: false },
  ];

  it("uses each flag's own fallback", async () => {
    const resolved = await resolveFlags(flags, "user_1", {
      load: () => Promise.reject(new Error("network")),
    });

    // A kill switch that fails off turns their outage into yours. A new code
    // path that fails on ships untested code at the worst moment.
    expect(resolved).toEqual({ "kill-switch": true, "risky-new-path": false });
  });

  it("does not throw, because a flag service being down is expected", async () => {
    await expect(
      resolveFlags(flags, "user_1", { load: () => Promise.reject(new Error("network")) }),
    ).resolves.toBeDefined();
  });

  it("falls back for a flag the service has forgotten about", async () => {
    const resolved = await resolveFlags(flags, "user_1", {
      load: async () => ({ "kill-switch": 100 }),
    });

    // Someone deleted it from the dashboard. This is the common case, not the
    // total outage.
    expect(resolved["risky-new-path"]).toBe(false);
  });

  it("uses the service's rollout when it answers", async () => {
    const resolved = await resolveFlags([{ key: "f", rollout: 0, fallback: false }], "user_1", {
      load: async () => ({ f: 100 }),
    });

    expect(resolved["f"]).toBe(true);
  });
});

describe("the lesson", () => {
  it("shows the same buckets after switching away and back", async () => {
    render(<FeatureFlags />);
    const before = within(screen.getByTestId("flag-new-checkout")).getAllByRole("cell")[2]
      ?.textContent;

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "User" }), "user_3");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "User" }), "user_1");

    expect(
      within(screen.getByTestId("flag-new-checkout")).getAllByRole("cell")[2]?.textContent,
    ).toBe(before);
  });
});
