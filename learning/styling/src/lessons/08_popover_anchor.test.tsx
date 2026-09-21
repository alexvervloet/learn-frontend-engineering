import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DISMISS_BEHAVIOUR,
  PopoverAndAnchor,
  supportsAnchorPositioning,
  supportsPopover,
} from "./08_popover_anchor";

const popoverCss = readFileSync(join(import.meta.dirname, "..", "popover.css"), "utf8");

/**
 * jsdom implements none of this.
 *
 * There is no `popover` property on HTMLElement, no `showPopover`, no top
 * layer and no `:popover-open`. So the split is the same one the rest of this
 * module makes, and it is worth being blunt about which half is which:
 *
 *   here       the markup is wired correctly, the stylesheet declares what it
 *              claims to, and the dismiss table matches the spec
 *   Chromium   it actually opens, it sits above an `overflow: hidden`
 *              ancestor, Escape closes the auto one and not the manual one
 *
 * The browser half is `learning/testing/e2e/popover.spec.ts`. A suite that
 * says "you would have to check this in a browser" and then does not is not
 * much better than no suite, which is the argument the testing module makes.
 */
describe("what jsdom can and cannot tell us", () => {
  it("has no popover support, so the component must not depend on it to render", () => {
    expect(supportsPopover()).toBe(false);

    // The point of asserting it: the component still renders, because the
    // attributes are inert rather than broken where they are unsupported.
    render(<PopoverAndAnchor />);
    expect(screen.getByTestId("anchored-tip")).toBeInTheDocument();
  });

  it("gives a false positive for anchor positioning, which is why the CSS has a fallback", () => {
    // jsdom's CSS.supports answers `true` to almost any syntactically valid
    // declaration, so this is not evidence that anchor positioning works. It
    // is documented here so nobody reads the `true` as a passing check.
    expect(supportsAnchorPositioning()).toBe(true);
    expect(CSS.supports("anchor-name", "--probe")).toBe(true);

    // Whereas a real browser without it answers false, and the stylesheet's
    // @supports block is what covers that case.
    expect(popoverCss).toMatch(/@supports not \(anchor-name:/);
  });
});

describe("the markup the platform reads", () => {
  it("opens the popover with attributes rather than an onClick", () => {
    render(<PopoverAndAnchor />);

    const trigger = screen.getByTestId("open-anchored");

    // popovertarget is the whole wiring. If this attribute is missing the
    // button does nothing at all, silently, in every browser.
    expect(trigger).toHaveAttribute("popovertarget", "anchored-tip");
    expect(screen.getByTestId("anchored-tip")).toHaveAttribute("id", "anchored-tip");
  });

  it("declares the two popovers with the kind each one needs", () => {
    render(<PopoverAndAnchor />);

    // auto: light dismiss, for something the user can walk away from.
    expect(screen.getByTestId("anchored-tip")).toHaveAttribute("popover", "auto");
    // manual: survives an outside click, for a toast.
    expect(screen.getByTestId("manual-note")).toHaveAttribute("popover", "manual");
  });

  it("uses popovertargetaction for the close button rather than a handler", () => {
    render(<PopoverAndAnchor />);

    // `hidden: true`, and the reason is the lesson. jsdom has no popover API
    // but its UA stylesheet still carries `[popover] { display: none }`, so a
    // closed popover is display:none and everything inside it is out of the
    // accessibility tree. That is exactly right, and it is the behaviour a
    // hand-rolled dropdown has to reproduce with aria-hidden or by not
    // rendering the content at all.
    const close = screen.getByRole("button", { name: "Close", hidden: true });

    expect(close).toHaveAttribute("popovertarget", "anchored-tip");
    // `hide` rather than the default `toggle`: a Close button that toggles
    // reopens the popover if anything else closed it first.
    expect(close).toHaveAttribute("popovertargetaction", "hide");
  });

  it("keeps a closed popover out of the accessibility tree", () => {
    render(<PopoverAndAnchor />);

    // Not "it is invisible". A screen reader user should not find a Close
    // button for a popover nobody opened, and the platform handles that from
    // the attribute alone.
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close", hidden: true })).toBeInTheDocument();

    // The trigger, by contrast, is a normal button.
    expect(screen.getByRole("button", { name: /Why is this anchored/ })).toBeInTheDocument();
  });

  it("names the anchor on the trigger, not on the popover", () => {
    // The direction catches people out: `anchor-name` goes on the thing being
    // pointed at, `position-anchor` on the thing doing the pointing. Swap them
    // and nothing errors, the popover just sits wherever the UA put it.
    render(<PopoverAndAnchor />);

    expect(screen.getByTestId("open-anchored")).toHaveClass("anchored-trigger");
    expect(screen.getByTestId("anchored-tip")).toHaveClass("anchored-popover");
  });
});

describe("the stylesheet", () => {
  it("puts anchor-name on the trigger class", () => {
    expect(popoverCss).toMatch(/\.anchored-trigger\s*\{[^}]*anchor-name:\s*--tip-anchor/);
  });

  it("points the popover at that exact name", () => {
    // A typo here is silent: an unmatched position-anchor falls back to the
    // UA's default placement and looks like a CSS bug rather than a typo.
    expect(popoverCss).toMatch(/\.anchored-popover\s*\{[^}]*position-anchor:\s*--tip-anchor/);
  });

  it("declares a fallback for when it would overflow the viewport", () => {
    // This is the flip middleware every popover library ships, in one line.
    expect(popoverCss).toMatch(/position-try-fallbacks:\s*flip-block/);
  });

  it("has a fallback for a browser with popover but not anchor positioning", () => {
    // The two shipped separately, so this combination is real rather than
    // hypothetical, and without the block the popover lands nowhere near the
    // button that opened it.
    const fallback = /@supports not \(anchor-name: --probe\) \{([\s\S]*?)\n\}/.exec(popoverCss);

    expect(fallback).not.toBeNull();
    expect(fallback?.[1]).toMatch(/position:\s*fixed/);
  });
});

describe("what each kind dismisses on", () => {
  it("says auto is light-dismiss and manual is not", () => {
    expect(DISMISS_BEHAVIOUR.auto).toEqual({
      escape: true,
      outsideClick: true,
      closesOtherPopovers: true,
    });
    expect(DISMISS_BEHAVIOUR.manual).toEqual({
      escape: false,
      outsideClick: false,
      closesOtherPopovers: false,
    });
  });

  it("agrees with the kinds the component actually uses", () => {
    // The table and the markup drifting apart is the failure mode of writing
    // the comparison as data, so tie the two together.
    render(<PopoverAndAnchor />);

    const anchored = screen.getByTestId("anchored-tip").getAttribute("popover");
    expect(anchored).not.toBeNull();
    expect(DISMISS_BEHAVIOUR[anchored as keyof typeof DISMISS_BEHAVIOUR].escape).toBe(true);

    const manual = screen.getByTestId("manual-note").getAttribute("popover");
    expect(manual).not.toBeNull();
    expect(DISMISS_BEHAVIOUR[manual as keyof typeof DISMISS_BEHAVIOUR].outsideClick).toBe(false);
  });
});
