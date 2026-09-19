/**
 * Controlled and uncontrolled inputs
 * ==================================
 * **Controlled**: React owns the value. Every keystroke sets state, which
 * re-renders, which sets `value` back on the input.
 *
 *   <input value={name} onChange={(e) => setName(e.target.value)} />
 *
 * **Uncontrolled**: the DOM owns the value. React sets an initial one and then
 * stays out of the way; you read it when you need it.
 *
 *   <input name="name" defaultValue="Ada" />
 *   new FormData(form).get("name")
 *
 * Neither is the right default. They answer different questions.
 *
 * **Controlled is worth it when something needs the value as it is typed**: a
 * live character count, a search that filters as you go, a field that formats
 * itself, a Submit button that enables on validity, or one field's value
 * driving another. The cost is a re-render of the component holding the state
 * on every keystroke, which is fine for a small form and is not fine for a
 * large one, because the whole subtree goes with it.
 *
 * **Uncontrolled is worth it when nothing needs the value until submit**, which
 * is most forms. Zero re-renders while typing, and `FormData` reads the whole
 * form in one line. React Hook Form, in the next lesson, is essentially this
 * with validation bolted on, and that is exactly why it is fast.
 *
 * The demo counts renders for both. Type ten characters into each: one form
 * re-renders ten times and the other not at all.
 *
 * **Things that catch people out.**
 *
 * `value={undefined}` then `value="x"` switches an input from uncontrolled to
 * controlled mid-life, and React warns. It happens whenever state is
 * initialised from data that arrives later. Initialise to `""`, not
 * `undefined`.
 *
 * `defaultValue` is only read on the first render. Changing it later does
 * nothing, which is the "my form does not update when the data loads" bug. Give
 * the form a `key` that changes with the record, and React will remount it with
 * the new defaults.
 *
 * An unticked checkbox is **absent** from `FormData`, not `false`. A `<select
 * multiple>` needs `getAll`. Number inputs give you strings.
 */
import { useState } from "react";

import { useRenderCount } from "../useRenderCount";

export type Submitted = { name: string; email: string; subscribed: boolean };

function Controlled({ onSubmit }: { onSubmit: (values: Submitted) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const renders = useRenderCount();

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name, email, subscribed });
      }}
    >
      <label className="row">
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="c-name" />
      </label>
      <label className="row">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="c-email"
        />
      </label>
      <label className="row">
        <input
          type="checkbox"
          checked={subscribed}
          onChange={(event) => setSubscribed(event.target.checked)}
          aria-label="c-subscribed"
        />
        Subscribe
      </label>

      {/* Only a controlled form can do this: the value is available now. */}
      <p className="note" data-testid="c-live">
        {name.length}/20 characters
      </p>
      <button type="submit" disabled={name.trim() === ""}>
        Submit controlled
      </button>
      <p className="note">
        <span data-testid="c-renders">{renders}</span> renders
      </p>
    </form>
  );
}

function Uncontrolled({ onSubmit }: { onSubmit: (values: Submitted) => void }) {
  const renders = useRenderCount();

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          // Absent, not false, when unticked.
          subscribed: data.get("subscribed") !== null,
        });
      }}
    >
      <label className="row">
        Name
        <input name="name" defaultValue="" aria-label="u-name" />
      </label>
      <label className="row">
        Email
        <input name="email" defaultValue="" aria-label="u-email" />
      </label>
      <label className="row">
        <input type="checkbox" name="subscribed" aria-label="u-subscribed" />
        Subscribe
      </label>

      <button type="submit">Submit uncontrolled</button>
      <p className="note">
        <span data-testid="u-renders">{renders}</span> renders
      </p>
    </form>
  );
}

export function ControlledUncontrolled() {
  const [last, setLast] = useState<Submitted | null>(null);

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: "flex-start", gap: "3rem" }}>
        <section>
          <h3>Controlled</h3>
          <Controlled onSubmit={setLast} />
        </section>
        <section>
          <h3>Uncontrolled</h3>
          <Uncontrolled onSubmit={setLast} />
        </section>
      </div>

      <pre className="log" data-testid="submitted">
        {last === null ? "nothing submitted" : JSON.stringify(last, null, 2)}
      </pre>

      <p className="note">
        Type the same thing into both. The left counter climbs with every keystroke and the right
        one does not move. The left one can show a live character count; the right one cannot.
      </p>
    </div>
  );
}
