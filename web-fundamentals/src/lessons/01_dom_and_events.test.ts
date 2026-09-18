import { beforeEach, describe, expect, it } from "vitest";

import { mountDelegation } from "./01_dom_and_events";

describe("event delegation", () => {
  let root: HTMLElement;
  let unmount: () => void;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.append(root);
    unmount = mountDelegation(root);
    return () => {
      unmount();
      root.remove();
    };
  });

  it("removes a row added after the listener was attached", () => {
    root.querySelector<HTMLButtonElement>("#add")?.click();
    const rows = root.querySelectorAll("li");
    expect(rows).toHaveLength(3);

    // The third row did not exist when the listener went on the <ul>.
    const last = rows[2];
    last?.querySelector<HTMLButtonElement>("button")?.click();

    expect(root.querySelectorAll("li")).toHaveLength(2);
  });

  it("ignores clicks that are not on a remove button", () => {
    root.querySelector<HTMLUListElement>("#list")?.click();
    expect(root.querySelectorAll("li")).toHaveLength(2);
  });

  it("stops responding once unmounted", () => {
    unmount();
    expect(root.innerHTML).toBe("");
  });
});
