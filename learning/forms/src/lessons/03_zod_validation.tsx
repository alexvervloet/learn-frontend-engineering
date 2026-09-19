/**
 * One schema, two jobs
 * ====================
 * Validation rules written inline in `register` work, and they live in exactly
 * one place: this component. The same rules exist again on the server, written
 * differently, and the two drift. A schema is one declaration that gives you
 * the runtime check, the TypeScript type, and something the server can import:
 *
 *   const Signup = z.object({ email: z.email(), age: z.coerce.number().min(18) });
 *   type Signup = z.infer<typeof Signup>;
 *
 * Then `zodResolver(Signup)` hands the whole thing to React Hook Form. Field
 * errors arrive under the field names automatically, because the schema's issue
 * paths match the form's field names.
 *
 * **Cross-field rules need `.refine`, and the path matters.**
 *
 *   .refine((v) => v.password === v.confirm, {
 *     message: "the passwords do not match",
 *     path: ["confirm"],
 *   })
 *
 * Leave `path` out and the issue lands on the form as a whole, so it renders
 * nowhere near the field it is about and screen readers never associate the
 * two. Almost every "my refine error does not show up" is a missing `path`.
 *
 * **Transforms mean the parsed value is not the input.** `z.coerce.number()`
 * turns the string a DOM input always gives you into a number, and `.trim()`
 * removes the whitespace before anything else looks at it. That is why
 * `z.infer` is the type of the *output*: your submit handler receives
 * `age: number`, not `age: string`. When the two differ,
 * `useForm<z.input<typeof S>, unknown, z.output<typeof S>>` types both ends
 * separately.
 *
 * **Validate the same schema on the server.** The client's copy is a
 * convenience for the person filling the form in. It is not a check: anyone can
 * post whatever they like. Sharing the module means the rules cannot drift; it
 * does not mean you can skip the server call.
 *
 * `z.email()` rather than `z.string().email()`: the latter is deprecated in
 * Zod 4.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

export const SignupSchema = z
  .object({
    // Trimmed before anything else sees it, so "  ada  " is a valid name.
    name: z.string().trim().min(2, "at least two characters"),
    email: z.email("that does not look like an email"),
    // A DOM input hands over a string. coerce turns it into a number here
    // rather than in every consumer.
    age: z.coerce.number().int("a whole number").min(18, "you must be 18 or older"),
    password: z.string().min(8, "at least 8 characters"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "the passwords do not match",
    // Without this the issue lands on the form, not the field, and renders
    // nowhere useful.
    path: ["confirm"],
  });

/** The output type. `age` is a number here, though the input was a string. */
export type Signup = z.infer<typeof SignupSchema>;

function FieldError({ message }: { message?: string }) {
  if (message === undefined) return null;
  return (
    <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
      {message}
    </p>
  );
}

export function ZodForm({ onValid }: { onValid?: (values: Signup) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof SignupSchema>, unknown, Signup>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { name: "", email: "", age: "", password: "", confirm: "" },
  });

  return (
    <form className="stack" onSubmit={handleSubmit((values) => onValid?.(values))} noValidate>
      <label className="row">
        Name
        <input aria-label="Name" {...register("name")} />
      </label>
      <FieldError message={errors.name?.message} />

      <label className="row">
        Email
        <input aria-label="Email" {...register("email")} />
      </label>
      <FieldError message={errors.email?.message} />

      <label className="row">
        Age
        <input aria-label="Age" inputMode="numeric" {...register("age")} />
      </label>
      <FieldError message={errors.age?.message} />

      <label className="row">
        Password
        <input type="password" aria-label="Password" {...register("password")} />
      </label>
      <FieldError message={errors.password?.message} />

      <label className="row">
        Confirm
        <input type="password" aria-label="Confirm" {...register("confirm")} />
      </label>
      <FieldError message={errors.confirm?.message} />

      <button type="submit">Sign up</button>
    </form>
  );
}

export function ZodValidation() {
  return (
    <div className="stack">
      <ZodForm />

      <p className="note">
        Submit it empty: every rule reports at once, each against its own field. Type mismatched
        passwords and the error appears on Confirm, because the refine names that path. Type{" "}
        <code>17</code> into Age and the message is about being 18, not about it being a string.
      </p>
    </div>
  );
}
