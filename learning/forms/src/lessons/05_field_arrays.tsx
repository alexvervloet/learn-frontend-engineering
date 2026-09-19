/**
 * Field arrays and async validation
 * =================================
 * **`useFieldArray` gives you `fields`, `append`, `remove`, `move`.** The one
 * rule that matters:
 *
 *   {fields.map((field, index) => <input key={field.id} {...register(`lines.${index}.label`)} />)}
 *
 * `key={field.id}`, never `key={index}`. This is the same trap as react-core's
 * keys lesson, and it is worse here because the values are in the DOM: remove
 * the first row with index keys and the text you typed into row two stays put
 * while the labels shift under it. Nothing errors; the data is simply attached
 * to the wrong row. RHF generates `field.id` for exactly this reason.
 *
 * Note that `field.id` is *not* your record's id. It is a key for React. If you
 * need the domain id, register it as a field.
 *
 * **`index` in the registered name is still positional**, which is why removing
 * a row has to go through `remove(index)` rather than filtering your own array:
 * RHF renumbers the registered names for you.
 *
 * **Async validation** is a `validate` function returning a promise. Anything
 * the client cannot know on its own goes here: is this username taken, is this
 * discount code real, does this postcode exist.
 *
 *   validate: async (value) => (await isTaken(value)) ? "already taken" : true
 *
 * Three things to get right.
 *
 * `formState.isValidating` exists so you can say "checking…" instead of leaving
 * the field looking finished while a request is in flight.
 *
 * **Debounce it, or you will send a request per keystroke.** The demo waits
 * 300ms after typing stops. Without that, "ada" is three requests, and the
 * answers can arrive out of order.
 *
 * **It is not a substitute for checking on submit.** Between the check passing
 * and the form being submitted, someone else can take the name. The server
 * decides; the async check is a courtesy so the user finds out early.
 */
import { useFieldArray, useForm } from "react-hook-form";

type Values = {
  username: string;
  lines: { label: string; quantity: number }[];
};

const TAKEN = new Set(["ada", "grace", "alan"]);

/** The fake availability endpoint. Exported so the test can assert against the same list. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return TAKEN.has(username.trim().toLowerCase());
}

function debounce<A extends unknown[], R>(fn: (...args: A) => Promise<R>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: A): Promise<R> =>
    new Promise((resolve) => {
      clearTimeout(timer);
      // Each new keystroke cancels the pending call, so only the last one runs.
      timer = setTimeout(() => void fn(...args).then(resolve), ms);
    });
}

const checkUsername = debounce(isUsernameTaken, 300);

export function FieldArrayForm({ onValid }: { onValid?: (values: Values) => void }) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValidating },
  } = useForm<Values>({
    defaultValues: { username: "", lines: [{ label: "Keyboard", quantity: 1 }] },
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "lines" });

  return (
    <form className="stack" noValidate onSubmit={handleSubmit((values) => onValid?.(values))}>
      <div className="stack">
        <label className="row">
          Username
          <input
            aria-label="Username"
            aria-invalid={errors.username ? true : undefined}
            {...register("username", {
              required: "pick a username",
              validate: async (value) =>
                (await checkUsername(value)) ? "that one is taken" : true,
            })}
          />
          {/* Without this the field looks settled while a request is in flight. */}
          <span className="note" data-testid="validating">
            {isValidating ? "checking…" : ""}
          </span>
        </label>
        {errors.username && (
          <p role="alert" style={{ color: "var(--danger)", margin: 0 }}>
            {errors.username.message}
          </p>
        )}
      </div>

      <ul className="stack" data-testid="lines">
        {fields.map((field, index) => (
          // field.id, not index. With an index key, removing a row leaves the
          // typed value behind on the row that took its place.
          <li key={field.id} className="row">
            <input
              aria-label={`Label ${index + 1}`}
              {...register(`lines.${index}.label` as const, { required: "a label is required" })}
            />
            <input
              type="number"
              min={1}
              style={{ width: "5rem" }}
              aria-label={`Quantity ${index + 1}`}
              {...register(`lines.${index}.quantity` as const, { valueAsNumber: true, min: 1 })}
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove line ${index + 1}`}
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move line ${index + 1} up`}
            >
              ↑
            </button>
          </li>
        ))}
      </ul>

      <div className="row">
        <button type="button" onClick={() => append({ label: "", quantity: 1 })}>
          Add a line
        </button>
        <button type="submit">Save</button>
      </div>
    </form>
  );
}

export function FieldArrays() {
  return (
    <div className="stack">
      <FieldArrayForm />

      <p className="note">
        Type <code>ada</code> as a username: after you stop typing, it is checked and rejected. Add
        three lines, fill them in, then remove the first one: the remaining values stay with their
        own rows.
      </p>
    </div>
  );
}
