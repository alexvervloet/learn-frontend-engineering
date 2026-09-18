/**
 * Events: currentTarget, target, and where the types come from
 * ===========================================================
 * **Inline handlers are typed for free.** Writing the handler in the JSX gives
 * TypeScript the element to work from, so the parameter needs no annotation:
 *
 *   <input onChange={(event) => setValue(event.target.value)} />
 *
 * Pull that function out into a `const` and the context is gone, so it needs
 * spelling out: `(event: ChangeEvent<HTMLInputElement>) => …`. That is the whole
 * reason event types show up in application code at all.
 *
 * **`currentTarget` is typed. `target` is not, and cannot be.**
 *
 *   currentTarget   the element the handler is attached to. React knows what
 *                   that is, so it is `HTMLFormElement`, `HTMLInputElement`, …
 *   target          the element that was actually clicked, which may be any
 *                   descendant. Its static type is `EventTarget`, with none of
 *                   the properties you want
 *
 * Both are spelled as intersections in React's types: `currentTarget` is
 * `EventTarget & T`, never plain `T`. That is so a handler can read the DOM
 * event's own members alongside the element's, and it matters the moment you
 * write a type assertion about one.
 *
 * On an `<input>` the two are the same element, which is why
 * `event.target.value` appears to work everywhere and then does not compile the
 * first time you put a handler on a `<form>` or a `<div>`. Reach for
 * `currentTarget` by default. It is both better typed and, usually, what you
 * meant.
 *
 * When you genuinely want `target`, narrow it. `event.target as HTMLInputElement`
 * is a lie that holds until someone puts an icon inside the button; a real check
 * does not:
 *
 *   if (!(event.target instanceof HTMLInputElement)) return;
 *
 * **`FormData.get` returns `FormDataEntryValue | null`.** That is `string | File
 * | null`. There is no input name TypeScript can check for you, so a missing
 * field is `null` at runtime and the type is telling the truth. Narrow it once,
 * at the edge, rather than sprinkling `as string`.
 *
 * `React.FormEvent` and friends are *synthetic* events: React's own wrapper over
 * the native one, with the real thing on `event.nativeEvent` if you need it.
 * They are no longer pooled, so holding on to one across an await is safe. Code
 * that calls `event.persist()` is from React 16.
 */
import { useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";

export type Submitted = { email: string; plan: string; newsletter: boolean };

/** Extracted, so the parameter type has to be written out. */
function describeClick(event: MouseEvent<HTMLButtonElement>): string {
  // currentTarget is the <button>, whatever was clicked inside it.
  return `${event.currentTarget.name} at ${Math.round(event.clientX)},${Math.round(event.clientY)}`;
}

export function Events() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [lastClick, setLastClick] = useState("");

  // Annotated, because it is not inline.
  function onEmailChange(event: ChangeEvent<HTMLInputElement>): void {
    setEmail(event.target.value);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    // currentTarget here is the form. `event.target` would be whichever control
    // caused the submit, and would not have `elements` on it.
    const data = new FormData(event.currentTarget);

    // get() returns string | File | null. Narrowing once here beats an `as`
    // at every use site.
    const rawEmail = data.get("email");
    const rawPlan = data.get("plan");

    setSubmitted({
      email: typeof rawEmail === "string" ? rawEmail : "",
      plan: typeof rawPlan === "string" ? rawPlan : "free",
      // A checkbox that is not ticked is absent from FormData entirely. It is
      // not "false"; it is missing.
      newsletter: data.get("newsletter") !== null,
    });
  }

  return (
    <div className="stack">
      <form className="stack" onSubmit={onSubmit}>
        <label className="row">
          Email
          <input name="email" value={email} onChange={onEmailChange} />
        </label>

        <label className="row">
          Plan
          <select name="plan" defaultValue="free">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </label>

        <label className="row">
          <input type="checkbox" name="newsletter" />
          Newsletter
        </label>

        <div className="row">
          <button name="save" type="submit" onClick={(event) => setLastClick(describeClick(event))}>
            Save
          </button>
        </div>
      </form>

      <p data-testid="last-click">{lastClick === "" ? "not clicked yet" : lastClick}</p>
      <pre className="log" data-testid="submitted">
        {submitted === null ? "nothing submitted" : JSON.stringify(submitted, null, 2)}
      </pre>

      <p className="note">
        Untick the newsletter box and submit: the key is absent from the FormData, not false. That
        is the bug behind every “my checkbox never saves” report.
      </p>
    </div>
  );
}
