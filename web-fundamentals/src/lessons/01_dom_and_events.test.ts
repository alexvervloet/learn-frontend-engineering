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

  it("clears the rows on Escape, from wherever focus is", () => {
    // The listener is on `document`, so this works without the list having
    // focus. That is the point of putting it there, and the reason it is the
    // one that has to be removed.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelectorAll("li")).toHaveLength(0);
  });

  it("stops responding once unmounted", () => {
    unmount();

    expect(root.innerHTML).toBe("");

    // Nothing left listening on document either. Without the
    // removeEventListener this would still be running against a detached
    // list, which costs nothing visible and is exactly why it survives review.
    expect(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    ).not.toThrow();
  });

  /**
   * The assertion the previous version of this file was missing.
   *
   * It checked `root.innerHTML === ""` and called that "stops responding",
   * which proves nothing: emptying an element drops its children, so the
   * listeners inside the markup are unreachable whether or not anyone removed
   * them. Deleting both `removeEventListener` calls left the whole suite green.
   *
   * The `document` listener is the one that can actually leak, and even that
   * is invisible from the outside: a leaked handler clears a list nobody can
   * see any more, so every user-facing assertion still passes.
   *
   * So hold a reference to the list the first mount owned. After the teardown
   * it is detached, but it is still a live node, and a leaked handler will
   * still be holding it. Put a row in it and dispatch the shortcut. If the row
   * survives, the listener is gone. If it does not, this lesson has been
   * quietly stacking handlers on every visit.
   */
  it("does not leave a document listener holding the old lesson", () => {
    const firstList = root.querySelector<HTMLUListElement>("#list");
    expect(firstList).not.toBeNull();

    unmount();
    unmount = mountDelegation(root);

    // The detached list keeps the two rows it had: `root.innerHTML = ""`
    // unhooks the <ul>, it does not empty it. Add one more so the number is
    // obviously ours, then check it survives.
    firstList?.append(document.createElement("li"));
    expect(firstList?.children).toHaveLength(3);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    // Untouched: nothing is listening on the old lesson's behalf. A leaked
    // handler would have called replaceChildren() on it and left zero.
    expect(firstList?.children).toHaveLength(3);
    // And the live one did respond.
    expect(root.querySelectorAll("li")).toHaveLength(0);
  });

  it("is fully alive after a remount, not a husk", () => {
    unmount();
    unmount = mountDelegation(root);

    expect(root.querySelectorAll("li")).toHaveLength(2);

    root.querySelector<HTMLButtonElement>("#add")?.click();
    expect(root.querySelectorAll("li")).toHaveLength(3);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelectorAll("li")).toHaveLength(0);
  });
});
