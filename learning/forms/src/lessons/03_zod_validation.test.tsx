import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SignupSchema, ZodForm } from "./03_zod_validation";

const VALID = {
  name: "Ada",
  email: "ada@example.com",
  age: "36",
  password: "longenough",
  confirm: "longenough",
};

async function fill(overrides: Partial<typeof VALID> = {}) {
  const values = { ...VALID, ...overrides };
  for (const [field, value] of Object.entries(values)) {
    const label = field[0]?.toUpperCase() + field.slice(1);
    const input = screen.getByLabelText(label);
    await userEvent.clear(input);
    if (value !== "") await userEvent.type(input, value);
  }
  await userEvent.click(screen.getByRole("button", { name: "Sign up" }));
}

describe("the schema on its own", () => {
  it("parses without a DOM, which is the point of having one", () => {
    const result = SignupSchema.safeParse(VALID);

    expect(result.success).toBe(true);
    // Coerced. The input was the string "36".
    expect(result.data?.age).toBe(36);
    expect(typeof result.data?.age).toBe("number");
  });

  it("trims before validating, so whitespace is not a name", () => {
    expect(SignupSchema.safeParse({ ...VALID, name: "  Ada  " }).data?.name).toBe("Ada");
    expect(SignupSchema.safeParse({ ...VALID, name: "  a  " }).success).toBe(false);
  });

  it("puts the cross-field issue on the field it is about", () => {
    const result = SignupSchema.safeParse({ ...VALID, confirm: "different" });

    expect(result.success).toBe(false);
    // Without `path` in the refine, this would be [] and the message would
    // render nowhere near the input.
    expect(result.error?.issues[0]?.path).toEqual(["confirm"]);
  });

  it("is the same rules the server would run", () => {
    // No React involved. This is the module a route handler imports.
    expect(SignupSchema.safeParse({ ...VALID, age: "12" }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...VALID, email: "nope" }).success).toBe(false);
  });
});

describe("the form", () => {
  it("reports every field at once rather than one at a time", async () => {
    render(<ZodForm />);

    await userEvent.click(screen.getByRole("button", { name: "Sign up" }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThanOrEqual(4);
  });

  it("shows the mismatch against Confirm, not against the form", async () => {
    render(<ZodForm />);

    await fill({ confirm: "different" });

    const alert = await screen.findByText("the passwords do not match");
    // Rendered inside the Confirm field's group, where a screen reader will
    // reach it after the input.
    expect(alert).toBeInTheDocument();
  });

  it("complains about the value, not about the type", async () => {
    render(<ZodForm />);

    await fill({ age: "17" });

    expect(await screen.findByText("you must be 18 or older")).toBeInTheDocument();
  });

  it("hands the submit handler the coerced values", async () => {
    const onValid = vi.fn();
    render(<ZodForm onValid={onValid} />);

    await fill();

    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({
        name: "Ada",
        email: "ada@example.com",
        age: 36,
        password: "longenough",
        confirm: "longenough",
      }),
    );
  });

  it("does not submit when anything fails", async () => {
    const onValid = vi.fn();
    render(<ZodForm onValid={onValid} />);

    await fill({ email: "nope" });

    await screen.findByText("that does not look like an email");
    expect(onValid).not.toHaveBeenCalled();
  });
});
