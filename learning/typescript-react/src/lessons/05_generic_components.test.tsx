import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GenericComponents, List, Text } from "./05_generic_components";

describe("List", () => {
  it("renders whatever the caller's renderItem returns", () => {
    render(
      <List
        items={[{ id: "a", name: "Ada" }]}
        getKey={(person) => person.id}
        renderItem={(person) => <strong>{person.name}</strong>}
      />,
    );

    expect(screen.getByText("Ada").tagName).toBe("STRONG");
  });

  it("uses getKey rather than the index, so it works on a list of strings", () => {
    render(<List items={["x", "y"]} getKey={(tag) => tag} renderItem={(tag) => tag} />);

    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
  });

  it("falls back to the empty slot", () => {
    render(<List items={[]} getKey={String} renderItem={String} empty="No results" />);

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("Text", () => {
  it("defaults to a span", () => {
    render(<Text>plain</Text>);

    expect(screen.getByText("plain").tagName).toBe("SPAN");
  });

  it("renders the element it was asked for, with that element's props", () => {
    render(
      <>
        <Text as="h4">A heading</Text>
        <Text as="a" href="https://react.dev">
          A link
        </Text>
      </>,
    );

    expect(screen.getByRole("heading", { level: 4, name: "A heading" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "A link" })).toHaveAttribute(
      "href",
      "https://react.dev",
    );
  });

  it("renders every example in the lesson", () => {
    render(<GenericComponents />);

    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /An anchor/ })).toBeInTheDocument();
  });
});
