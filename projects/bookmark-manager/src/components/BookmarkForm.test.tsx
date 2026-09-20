import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BookmarkForm } from "./BookmarkForm";
import { BookmarkSchema, parseTags } from "./bookmarkSchema";

const VALID = {
  title: "Rules of React",
  url: "https://react.dev",
  description: "The short version",
  tags: "react, docs",
};

async function fill(overrides: Partial<typeof VALID> = {}) {
  const values = { ...VALID, ...overrides };

  for (const [field, value] of Object.entries(values)) {
    const label = field[0]?.toUpperCase() + field.slice(1);
    const input = screen.getByLabelText(label === "Url" ? "URL" : label);
    await userEvent.clear(input);
    if (value !== "") await userEvent.type(input, value);
  }

  await userEvent.click(screen.getByRole("button", { name: /Add it|Save/ }));
}

function renderForm(props: Partial<React.ComponentProps<typeof BookmarkForm>> = {}) {
  const onSubmit = vi.fn();
  render(<BookmarkForm submitLabel="Add it" isSubmitting={false} onSubmit={onSubmit} {...props} />);
  return { onSubmit };
}

describe("the schema on its own", () => {
  it("parses without a DOM, which is the point of having one", () => {
    expect(BookmarkSchema.safeParse(VALID).success).toBe(true);
  });

  it("trims before validating, so whitespace is not a title", () => {
    expect(BookmarkSchema.safeParse({ ...VALID, title: "  ab  " }).data?.title).toBe("ab");
    expect(BookmarkSchema.safeParse({ ...VALID, title: "  a  " }).success).toBe(false);
  });

  it("requires an absolute URL", () => {
    expect(BookmarkSchema.safeParse({ ...VALID, url: "/relative" }).success).toBe(false);
    expect(BookmarkSchema.safeParse({ ...VALID, url: "react.dev" }).success).toBe(false);
  });

  it("is the same rules the server runs", () => {
    // src/api/handlers.ts rejects the same two cases with a 422. The client
    // copy is a courtesy to the person typing, not the check.
    expect(BookmarkSchema.safeParse({ ...VALID, title: "a" }).success).toBe(false);
  });
});

describe("parsing the tag field", () => {
  it("splits, trims and lowercases", () => {
    expect(parseTags(" React , CSS ")).toEqual(["react", "css"]);
  });

  it("drops empties and duplicates", () => {
    expect(parseTags("react,,react, ,REACT")).toEqual(["react"]);
  });

  it("returns nothing for an empty field", () => {
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("the form", () => {
  it("does not nag before the first submit", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("URL"), "nope");

    // Validating an email or a URL someone is halfway through typing is the
    // reason the default is onSubmit.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports every problem at once, in a summary", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Add it" }));

    const summary = await screen.findByTestId("form-errors");
    expect(within(summary).getByRole("heading")).toHaveTextContent("There are 2 problems");
  });

  it("moves focus to the summary, so the count is announced", async () => {
    renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Add it" }));

    // The callback on handleSubmit runs before the re-render, so the summary
    // does not exist yet and focusing it there is a silent no-op. This is an
    // effect keyed on submitCount.
    await waitFor(() => expect(screen.getByTestId("form-errors")).toHaveFocus());
  });

  it("links each problem to its field", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Add it" }));

    const summary = await screen.findByTestId("form-errors");
    const link = within(summary).getByRole("link", { name: /title/i });
    const target = link.getAttribute("href")?.slice(1) ?? "";

    expect(document.getElementById(target)).toBe(screen.getByLabelText("Title"));
  });

  it("marks the field invalid and describes it with the error", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Add it" }));
    await screen.findByTestId("form-errors");

    const title = screen.getByLabelText("Title");
    expect(title).toHaveAttribute("aria-invalid", "true");

    const describedBy = title.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)).toHaveTextContent(/at least two characters/);
  });

  it("does not describe a valid field with a dangling id", () => {
    renderForm();

    // A pointer at an id that is not rendered makes some screen readers read
    // nothing at all.
    expect(screen.getByLabelText("Title")).not.toHaveAttribute("aria-describedby");
  });

  it("hands over the parsed values", async () => {
    const { onSubmit } = renderForm();

    await fill();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Rules of React",
        url: "https://react.dev",
        description: "The short version",
        tags: ["react", "docs"],
      }),
    );
  });

  it("sends null rather than an empty description", async () => {
    const { onSubmit } = renderForm();

    await fill({ description: "" });

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ description: null });
  });

  it("shows a server error in the same summary", async () => {
    renderForm({ serverError: "The server refused it" });

    const summary = screen.getByTestId("form-errors");
    expect(within(summary).getByRole("heading")).toHaveTextContent("The server rejected it");
    expect(summary).toHaveTextContent("The server refused it");
  });
});
