import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LessonShell } from "./LessonShell";
import { defineLessons } from "./types";

function Counter() {
  return <p>counter demo</p>;
}

function Boom(): never {
  throw new Error("lesson exploded");
}

const lessons = defineLessons([
  { id: "one", group: "Basics", title: "First", summary: "s1", file: "a.tsx", Component: Counter },
  { id: "two", group: "Basics", title: "Second", summary: "s2", file: "b.tsx", Component: Counter },
  { id: "boom", group: "Broken", title: "Boom", summary: "s3", file: "c.tsx", Component: Boom },
]);

function renderShell() {
  return render(<LessonShell title="Module" subtitle="sub" lessons={lessons} />);
}

describe("LessonShell", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("falls back to the first lesson when the hash matches nothing", () => {
    window.location.hash = "#does-not-exist";
    renderShell();

    expect(screen.getByRole("heading", { level: 2, name: "First" })).toBeInTheDocument();
  });

  it("marks the active lesson for assistive tech, not just visually", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "Second" }));

    expect(screen.getByRole("link", { name: "Second" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "First" })).not.toHaveAttribute("aria-current");
  });

  it("puts the selected lesson in the URL so a refresh keeps it", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "Second" }));

    expect(window.location.hash).toBe("#two");
  });

  it("shows a throwing lesson as an error instead of unmounting the sidebar", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("link", { name: "Boom" }));

    expect(screen.getByRole("alert")).toHaveTextContent("lesson exploded");
    expect(screen.getByRole("navigation", { name: "Lessons" })).toBeInTheDocument();
  });
});
