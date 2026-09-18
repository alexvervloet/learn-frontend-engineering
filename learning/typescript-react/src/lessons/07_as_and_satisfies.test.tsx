import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AsAndSatisfies, check, trust } from "./07_as_and_satisfies";

describe("an unchecked assertion", () => {
  it("returns happily for data that is nothing like the type", () => {
    const wrong = trust('{ "id": "1" }');

    // Typed as Bookmark. Is not one. Nothing threw.
    expect(wrong.title).toBeUndefined();
  });

  it("fails at the point of use instead, a long way from the parse", () => {
    const wrong = trust('{ "id": "1" }');

    expect(() => wrong.title.toUpperCase()).toThrow(TypeError);
  });

  it("silently produces nonsense when the type is merely wrong", () => {
    const wrong = trust('{ "id": "1", "title": "t", "votes": "twelve" }');

    // `votes + 1` is typed number + number. At runtime it is string + number.
    expect(wrong.votes + 1).toBe("twelve1");
  });
});

describe("a schema at the boundary", () => {
  it("accepts data that matches", () => {
    const result = check('{ "id": "1", "title": "Rules of React", "votes": 12 }');

    expect(result).toEqual({ ok: true, value: { id: "1", title: "Rules of React", votes: 12 } });
  });

  it("names the field and the problem", () => {
    const result = check('{ "id": "1", "title": "t", "votes": "twelve" }');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.problems[0]).toMatch(/^votes:/);
  });

  it("reports a missing field rather than discovering it later", () => {
    const result = check('{ "id": "1" }');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.problems.join(" ")).toMatch(/title/);
  });

  it("separates 'not JSON' from 'JSON of the wrong shape'", () => {
    const result = check("definitely not json");

    expect(result).toEqual({ ok: false, problems: ["that is not JSON"] });
  });

  it("rejects an empty title, which is valid JSON and a valid string", () => {
    const result = check('{ "id": "1", "title": "", "votes": 0 }');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.problems.join(" ")).toContain("title cannot be empty");
  });
});

describe("the lesson", () => {
  it("shows the assertion throwing and the schema explaining, on the same input", async () => {
    render(<AsAndSatisfies />);

    await userEvent.click(screen.getByRole("button", { name: "missing" }));
    await userEvent.click(screen.getByRole("button", { name: "Parse with `as`" }));
    await userEvent.click(screen.getByRole("button", { name: "Parse with a schema" }));

    expect(screen.getByTestId("trusted")).toHaveTextContent("threw at the point of use");
    expect(screen.getByTestId("checked")).toHaveTextContent("title");
  });
});
