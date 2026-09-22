/**
 * Errors a screen reader can find
 * ===============================
 * A red border and some red text below the field is a working error message
 * for people who can see it, in colour, and who happened to be looking at that
 * part of the page. For everyone else it does not exist. Four things fix that,
 * and none of them is hard.
 *
 * **`aria-invalid` on the field.** This is what makes a screen reader say
 * "invalid" when focus lands on the input. Set it to `true` only when the field
 * actually has an error, never permanently.
 *
 * **`aria-describedby` pointing at the message.** Without it, the message is
 * text that happens to sit nearby in the DOM; with it, the message is read out
 * as part of the field. It takes several ids, so a hint and an error can both
 * be attached:
 *
 *   aria-describedby="email-hint email-error"
 *
 * Point at ids that do not exist and some screen readers say nothing at all, so
 * build the list from what is actually rendered.
 *
 * **Focus the first invalid field on submit.** Otherwise focus stays on the
 * button, and a keyboard or screen reader user is told something failed with no
 * indication of where. React Hook Form does this by default via
 * `shouldFocusError`; if you are hand-rolling, do it in the error branch of
 * your submit handler.
 *
 * **A summary at the top, for anything longer than about three fields.** One
 * `role="alert"` region listing every problem, each item a link to its field.
 * This is the GOV.UK pattern and it is the best-tested error UI there is.
 * Moving focus to the summary on submit means the count is announced and the
 * links are the next thing you reach.
 *
 * **`role="alert"` or `aria-live="polite"`?** `alert` is assertive: it
 * interrupts whatever is being read. Right for a submit summary, wrong for a
 * field that validates as you type, where it interrupts you mid-word, every
 * word. Use `polite` for anything that updates while typing.
 *
 * **Never colour alone.** Every error here has text, an icon character and a
 * changed border. Around one man in twelve cannot reliably tell your red from
 * your grey.
 *
 * **But hide the icon from the accessibility tree.** A bare glyph in the
 * markup is text, so it goes into the description the screen reader reads for
 * the field, and the user hears whatever that character is called before they
 * hear the problem. `aria-hidden="true"` on the glyph keeps the redundancy
 * where it helps and out of where it does not.
 */
import { useEffect, useId, useRef } from "react";
import { useForm } from "react-hook-form";

type Values = { email: string; password: string; nickname: string };

export function AccessibleForm({ onValid }: { onValid?: (values: Values) => void }) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const ids = {
    email: useId(),
    password: useId(),
    nickname: useId(),
  };

  const {
    register,
    handleSubmit,
    formState: { errors, submitCount },
  } = useForm<Values>({
    defaultValues: { email: "", password: "", nickname: "" },
  });

  const problems = (
    [
      ["email", errors.email?.message],
      ["password", errors.password?.message],
      ["nickname", errors.nickname?.message],
    ] as const
  ).filter((entry): entry is [keyof Values, string] => typeof entry[1] === "string");

  // Focus the summary rather than the first field: the count is announced, and
  // the links to each field are the next stop.
  //
  // This has to be an effect, not `handleSubmit`'s error callback. That callback
  // runs before React has re-rendered, so the summary does not exist yet and
  // `summaryRef.current` is still null. The focus call silently does nothing,
  // which is a genuinely hard bug to see: the errors appear, and focus is just
  // left behind on the button.
  useEffect(() => {
    if (submitCount === 0) return;
    summaryRef.current?.focus();
  }, [submitCount]);

  function describedBy(field: keyof Values, hasHint: boolean): string | undefined {
    const parts = [
      hasHint ? `${ids[field]}-hint` : null,
      errors[field] ? `${ids[field]}-error` : null,
    ].filter((part): part is string => part !== null);

    // An id that is not rendered makes some screen readers read nothing at all,
    // so build the list from what exists rather than listing both always.
    return parts.length === 0 ? undefined : parts.join(" ");
  }

  return (
    <form className="stack" noValidate onSubmit={handleSubmit((values) => onValid?.(values))}>
      {problems.length > 0 && (
        <div
          ref={summaryRef}
          // Assertive, because the user just pressed a button and is waiting.
          role="alert"
          tabIndex={-1}
          data-testid="summary"
          style={{
            border: "2px solid var(--danger)",
            borderRadius: "var(--radius)",
            padding: "0.75rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.4rem" }}>
            There {problems.length === 1 ? "is 1 problem" : `are ${problems.length} problems`}
          </h4>
          <ul style={{ margin: 0, paddingInlineStart: "1.1rem" }}>
            {problems.map(([field, message]) => (
              <li key={field}>
                <a href={`#${ids[field]}`}>{message}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="stack">
        <label htmlFor={ids.email}>Email</label>
        <p id={`${ids.email}-hint`} className="note">
          We only use this to sign you in.
        </p>
        <input
          id={ids.email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("email", true)}
          style={{ borderColor: errors.email ? "var(--danger)" : undefined }}
          {...register("email", {
            required: "Enter your email address",
            pattern: { value: /.+@.+\..+/, message: "Enter an email address in the right format" },
          })}
        />
        {errors.email && (
          <p id={`${ids.email}-error`} style={{ color: "var(--danger)", margin: 0 }}>
            {/* Text, not just colour. And the glyph is decoration, so it is hidden
                from the accessibility tree: the words are the message. */}
            <span aria-hidden="true">✕</span> {errors.email.message}
          </p>
        )}
      </div>

      <div className="stack">
        <label htmlFor={ids.password}>Password</label>
        <input
          id={ids.password}
          type="password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={describedBy("password", false)}
          {...register("password", {
            required: "Enter a password",
            minLength: { value: 8, message: "Use at least 8 characters" },
          })}
        />
        {errors.password && (
          <p id={`${ids.password}-error`} style={{ color: "var(--danger)", margin: 0 }}>
            <span aria-hidden="true">✕</span> {errors.password.message}
          </p>
        )}
      </div>

      <div className="stack">
        <label htmlFor={ids.nickname}>Nickname (optional)</label>
        <input
          id={ids.nickname}
          aria-describedby={describedBy("nickname", false)}
          {...register("nickname")}
        />
      </div>

      <button type="submit">Create account</button>
      <p className="note" data-testid="submit-count">
        submitted {submitCount} times
      </p>
    </form>
  );
}

export function AccessibleErrors() {
  return (
    <div className="stack">
      <AccessibleForm />

      <p className="note">
        Submit it empty with the keyboard. Focus lands on the summary, which announces how many
        problems there are, and Tab takes you straight to a link that jumps to the field. Then turn
        on VoiceOver and tab into Email: it reads the label, the hint and the error.
      </p>
    </div>
  );
}
