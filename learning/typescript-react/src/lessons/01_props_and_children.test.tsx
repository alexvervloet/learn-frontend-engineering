import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, Card } from "./01_props_and_children";

describe("extending a DOM element", () => {
  it("forwards native attributes nobody wrote into the props type", () => {
    render(
      <Button type="submit" disabled aria-label="save the thing">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "save the thing" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeDisabled();
  });

  it("forwards handlers", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Press</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Press" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps its own style and the caller's, rather than one winning outright", () => {
    render(
      <Button variant="danger" style={{ textTransform: "uppercase" }}>
        Delete
      </Button>,
    );

    // The CSS spelling, not the React one: jest-dom parses this as CSS, and an
    // object with camelCase keys matches nothing. Avoid the properties jsdom
    // normalises on the way in, too, or you end up asserting `font-weight: 700`
    // against the `bold` you wrote.
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveStyle("text-transform: uppercase");
    expect(button.style.color).not.toBe("");
  });
});

describe("children as ReactNode", () => {
  it("renders the things that are not elements", () => {
    render(
      <Card title="Mixed">
        {"a string"}
        {42}
        {null}
        {false}
        <strong>an element</strong>
      </Card>,
    );

    // null and false render nothing at all, which is why ReactNode includes them.
    expect(screen.getByRole("heading", { name: "Mixed" })).toBeInTheDocument();
    expect(screen.getByText(/a string/)).toBeInTheDocument();
    expect(screen.getByText("an element")).toBeInTheDocument();
  });

  it("leaves the footer out when it was not given", () => {
    const { rerender } = render(<Card title="No footer">body</Card>);
    expect(screen.queryByText("the footer")).not.toBeInTheDocument();

    rerender(
      <Card title="No footer" footer="the footer">
        body
      </Card>,
    );
    expect(screen.getByText("the footer")).toBeInTheDocument();
  });
});
