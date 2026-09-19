import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Banner, Card, Warning, classNames } from "./01_css_modules";

describe("scoping", () => {
  it("gives two files' .title different names", () => {
    // Written as `.title` in both source files.
    expect(classNames.cardTitle).not.toBe(classNames.bannerTitle);
  });

  it("keeps the original name recognisable in the hashed one", () => {
    // Vite's default pattern includes the source name, which is what makes
    // devtools readable.
    expect(classNames.cardTitle).toMatch(/title/);
    expect(classNames.bannerTitle).toMatch(/title/);
  });

  it("resolves to a real class, not undefined", () => {
    // Without `css` enabled in vitest.config.ts every one of these would be
    // undefined and this whole file would pass by accident.
    for (const value of Object.values(classNames)) {
      expect(value).toBeTypeOf("string");
      expect(value).not.toBe("");
    }
  });
});

describe("composes", () => {
  it("puts two class names on the element rather than copying declarations", () => {
    render(<Warning title="t" body="b" />);

    const classes = screen.getByTestId("warning").className.split(" ");
    expect(classes.length).toBeGreaterThan(1);
  });

  it("shares the composed base between both variants", () => {
    render(
      <>
        <Card title="c" body="b" />
        <Warning title="w" body="b" />
      </>,
    );

    const card = new Set(screen.getByTestId("card").className.split(" "));
    const warning = new Set(screen.getByTestId("warning").className.split(" "));
    const shared = [...card].filter((name) => warning.has(name));

    // The base. The variant-specific class is not shared.
    expect(shared).toHaveLength(1);
  });
});

describe("the components", () => {
  it("renders each heading under its own class", () => {
    render(
      <>
        <Banner>banner text</Banner>
        <Card title="card title" body="b" />
      </>,
    );

    expect(screen.getByTestId("banner")).toHaveClass(classNames.bannerTitle);
    expect(screen.getByRole("heading", { name: "card title" })).toHaveClass(classNames.cardTitle);
  });
});
