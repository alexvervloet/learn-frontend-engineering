/**
 * React Hook Form
 * ===============
 * RHF is the previous lesson's uncontrolled form with validation attached. That
 * is the whole design, and it is where the performance comes from:
 *
 *   const { register, handleSubmit, formState } = useForm<Values>();
 *   <input {...register("email")} />
 *
 * `register` returns `name`, `onChange`, `onBlur` and a `ref`. The value lives
 * in the DOM. Typing does not set React state, so the component does not
 * re-render, so a form with forty fields costs the same per keystroke as a form
 * with two.
 *
 * **`formState` is a Proxy, and that matters.** Reading `formState.errors`
 * subscribes the component to errors; not reading `isDirty` means changes to
 * `isDirty` do not wake it. So destructure only what you use:
 *
 *   const { errors, isSubmitting } = formState;      // subscribed to two things
 *   const formState = form.formState;                 // subscribed to nothing
 *                                                     // until you read a field
 *
 * The consequence people hit: destructuring inside a conditional, or passing
 * `formState` whole to a child, changes what you are subscribed to and makes
 * re-renders appear or vanish for no visible reason.
 *
 * It is also why this form re-renders exactly once while you type fifteen
 * characters, rather than not at all. The one render is `isDirty` going false
 * to true on the first keystroke, and this component reads `isDirty` to show
 * the unsaved-changes note. Drop that and typing costs nothing at all. Whether
 * you want the subscription is a real decision, not an oversight.
 *
 * **`mode` decides when validation runs.** The default is `onSubmit`, then
 * `onChange` once a field has errored (`reValidateMode`). That default is
 * deliberate and good: validating as someone types their email tells them it is
 * invalid before they have finished typing it, which is nagging. `onBlur` is
 * the other reasonable choice; `onChange` from the start rarely is.
 *
 * **`Controller` is for components that are not DOM inputs.** A design-system
 * select, a date picker, anything that does not take a `ref` and emit DOM
 * events. It is controlled, so it re-renders on change: use it where you have
 * to, not everywhere.
 *
 * **`handleSubmit` does not run your function when validation fails.** It takes
 * a second callback for that case, which is where focus management belongs; see
 * lesson 04.
 */
import { Controller, useForm } from "react-hook-form";

import { useRenderCount } from "../useRenderCount";

export type Values = {
  email: string;
  password: string;
  plan: "free" | "pro";
};

export function ReactHookForm({ onValid }: { onValid?: (values: Values) => void }) {
  const renders = useRenderCount();

  const {
    register,
    handleSubmit,
    control,
    reset,
    // Destructure what you use. Reading `errors` and `isSubmitting` here is
    // what subscribes this component to them.
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    defaultValues: { email: "", password: "", plan: "free" },
    // The default. Validate on submit, then re-validate as they fix it.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (values) => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        onValid?.(values);
        reset(values);
      })}
      noValidate
    >
      <label className="row">
        Email
        <input
          aria-label="Email"
          {...register("email", {
            required: "an email is required",
            pattern: { value: /.+@.+\..+/, message: "that does not look like an email" },
          })}
        />
      </label>
      {errors.email && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {errors.email.message}
        </p>
      )}

      <label className="row">
        Password
        <input
          type="password"
          aria-label="Password"
          {...register("password", {
            required: "a password is required",
            minLength: { value: 8, message: "at least 8 characters" },
          })}
        />
      </label>
      {errors.password && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {errors.password.message}
        </p>
      )}

      {/* Not a plain input, so it goes through Controller. This one is
          controlled and does re-render on change, which is the trade. */}
      <Controller
        control={control}
        name="plan"
        render={({ field }) => (
          <label className="row">
            Plan
            <select {...field} aria-label="Plan">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </label>
        )}
      />

      <div className="row">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
        <span className="note" data-testid="dirty">
          {isDirty ? "unsaved changes" : "no changes"}
        </span>
      </div>

      <p className="note">
        <span data-testid="rhf-renders">{renders}</span> renders
      </p>
    </form>
  );
}

export function ReactHookFormLesson() {
  return (
    <div className="stack">
      <ReactHookForm />

      <p className="note">
        Type a long email. The counter does not move, because the value is in the DOM. Submit an
        empty form and it moves once, when the errors appear. Then fix a field and watch it
        re-validate as you type, but only after it has already complained once.
      </p>
    </div>
  );
}
