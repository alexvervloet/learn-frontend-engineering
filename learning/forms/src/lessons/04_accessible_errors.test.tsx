import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AccessibleForm } from "./04_accessible_errors";

async function submitEmpty() {
  render(<AccessibleForm />);
  await userEvent.click(screen.getByRole("button", { name: "Create account" }));
  return screen.findByTestId("summary");
}

describe("the field itself", () => {
  it("is marked invalid only once it is", async () => {
    render(<AccessibleForm />);
    const email = screen.getByLabelText("Email");

    // Not aria-invalid="false" everywhere: a permanently present attribute is
    // noise a screen reader has to read past.
    expect(email).not.toHaveAttribute("aria-invalid");

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });

  it("describes itself with the hint, and then with the hint and the error", async () => {
    render(<AccessibleForm />);
    const before = screen.getByLabelText("Email").getAttribute("aria-describedby");

    expect(before?.split(" ")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    const after = screen.getByLabelText("Email").getAttribute("aria-describedby");
    expect(after?.split(" ")).toHaveLength(2);
  });

  it("points only at ids that are really on the page", async () => {
    await submitEmpty();

    for (const label of ["Email", "Password"]) {
      const ids = screen.getByLabelText(label).getAttribute("aria-describedby")?.split(" ") ?? [];
      expect(ids.length).toBeGreaterThan(0);
      // A dangling id makes some screen readers read nothing at all.
      for (const id of ids) expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("leaves a valid optional field undescribed rather than pointing at nothing", () => {
    render(<AccessibleForm />);

    expect(screen.getByLabelText("Nickname (optional)")).not.toHaveAttribute("aria-describedby");
  });
});

describe("the summary", () => {
  it("counts the problems", async () => {
    const summary = await submitEmpty();

    expect(within(summary).getByRole("heading")).toHaveTextContent("There are 2 problems");
  });

  it("takes focus, so the count is announced and the links are next", async () => {
    const summary = await submitEmpty();

    expect(summary).toHaveFocus();
  });

  it("links each problem to its field", async () => {
    const summary = await submitEmpty();
    const link = within(summary).getByRole("link", { name: "Enter your email address" });

    const target = link.getAttribute("href")?.slice(1) ?? "";
    expect(document.getElementById(target)).toBe(screen.getByLabelText("Email"));
  });

  it("is assertive, because the user just pressed a button and is waiting", async () => {
    const summary = await submitEmpty();

    expect(summary).toHaveAttribute("role", "alert");
  });

  it("disappears once the problems are fixed", async () => {
    render(<AccessibleForm />);
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByTestId("summary");

    await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "longenough");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.queryByTestId("summary")).not.toBeInTheDocument();
  });
});

describe("not colour alone", () => {
  it("says what is wrong in words, next to the field", async () => {
    await submitEmpty();

    // Deliberately two of each: one in the summary, one beside the field. The
    // border colour is not the message; these are.
    expect(screen.getAllByText(/Enter your email address/)).toHaveLength(2);

    const email = screen.getByLabelText("Email");
    const errorId = email.getAttribute("aria-describedby")?.split(" ").at(-1) ?? "";
    expect(document.getElementById(errorId)).toHaveTextContent("Enter your email address");
  });

  /**
   * The icon is for the eyes, so keep it out of the ears.
   *
   * A bare "x" in the markup is text like any other, and the description a
   * screen reader reads out for the field begins with whatever it decides to
   * call that character. The redundancy that helps a sighted user is noise to
   * everyone else, so the glyph is `aria-hidden` and the words carry the
   * meaning on their own.
   */
  it("does not read the decorative glyph out as part of the error", async () => {
    await submitEmpty();

    const email = screen.getByLabelText("Email");

    expect(email).toHaveAccessibleDescription(expect.stringContaining("Enter your email address"));
    expect(email).not.toHaveAccessibleDescription(expect.stringContaining("✕"));
  });
});
