import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Keyboard, NaiveToolbar, SkipLink, Toolbar } from "./02_keyboard";

describe("roving tabindex", () => {
  it("has exactly one tab stop, whatever is focused", async () => {
    render(<Toolbar />);

    const zeroes = () =>
      screen.getAllByRole("button").filter((button) => button.tabIndex === 0).length;

    expect(zeroes()).toBe(1);

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}");

    // Still exactly one. The 0 moved; it did not multiply.
    expect(zeroes()).toBe(1);
  });

  it("moves focus with the arrow keys, not just the tabindex", async () => {
    render(<Toolbar />);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");

    // Setting tabIndex without calling focus() is the bug: the tab stop moves
    // and the user does not.
    expect(screen.getByRole("button", { name: "Italic" })).toHaveFocus();
  });

  it("wraps around at both ends", async () => {
    render(<Toolbar />);
    await userEvent.tab();

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("button", { name: "Strike" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("supports Home and End, which the pattern requires", async () => {
    render(<Toolbar />);
    await userEvent.tab();

    await userEvent.keyboard("{End}");
    expect(screen.getByRole("button", { name: "Strike" })).toHaveFocus();

    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveFocus();
  });

  it("leaves the toolbar in one more Tab press", async () => {
    render(
      <>
        <Toolbar />
        <button>After the toolbar</button>
      </>,
    );

    await userEvent.tab();
    await userEvent.tab();

    // Four buttons, two presses to get past them.
    expect(screen.getByRole("button", { name: "After the toolbar" })).toHaveFocus();
  });
});

describe("the naive version", () => {
  it("costs one Tab press per button", async () => {
    render(
      <>
        <NaiveToolbar />
        <button>After the toolbar</button>
      </>,
    );

    for (let i = 0; i < 5; i += 1) await userEvent.tab();

    // Five presses to get past four buttons, against two for the roving
    // version above. Twenty buttons is twenty-one presses, on every page that
    // shows the toolbar.
    expect(screen.getByRole("button", { name: "After the toolbar" })).toHaveFocus();
  });
});

describe("the skip link", () => {
  it("is the first thing Tab reaches", async () => {
    render(<Keyboard />);

    await userEvent.tab();

    expect(screen.getByTestId("skip-link")).toHaveFocus();
  });

  it("is off screen but focusable, not hidden", async () => {
    render(<SkipLink />);
    const link = screen.getByTestId("skip-link");

    // display:none or visibility:hidden would remove it from the tab order and
    // make the whole thing pointless.
    expect(link.style.left).toBe("-9999px");

    await userEvent.tab();

    expect(link).toHaveFocus();
    expect(link.style.left).toBe("0.5rem");
  });

  it("points at a target that can actually receive focus", () => {
    render(<Keyboard />);
    const target = document.getElementById("lesson-main");

    // Without tabIndex={-1} the browser moves the viewport and leaves focus
    // where it was, so the next Tab goes back to the navigation.
    expect(target).not.toBeNull();
    expect(target).toHaveAttribute("tabindex", "-1");
  });
});
