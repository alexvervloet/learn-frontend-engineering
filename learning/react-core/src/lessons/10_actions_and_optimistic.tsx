/**
 * Form actions, useActionState, and useOptimistic
 * ==============================================
 * React 19 turned "submit a form and wait" into first-class API instead of
 * something everyone hand-rolled with three `useState` calls.
 *
 *   <form action={fn}>    fn receives the FormData. React treats the whole
 *                         thing as a transition and resets the form on success
 *   useActionState        wraps that function and hands back its return value,
 *                         plus a pending flag. This is where an error message
 *                         lives
 *   useFormStatus         read by a *child* of the form: pending, the data being
 *                         sent, the method. It is how a submit button knows it
 *                         is busy without being passed a prop
 *   useOptimistic         show the result you expect immediately, and let React
 *                         roll it back automatically if the action throws
 *
 * The rollback is the part worth dwelling on. You do not write it. `useOptimistic`
 * returns to the real state when the surrounding action finishes, whatever the
 * outcome, so there is no "undo my optimistic update" branch to get wrong. That
 * branch is where hand-written optimistic UI goes bad: the happy path gets
 * tested and the failure path leaves a ghost row on screen forever.
 *
 * `useFormStatus` only works in a component *inside* the form. Calling it in the
 * component that renders the `<form>` returns pending: false, always. That is
 * the single most common complaint about it, and it is working as designed.
 *
 * Post a comment containing the word "fail" to watch the rollback.
 */
import { useActionState, useOptimistic, useState } from "react";
import { useFormStatus } from "react-dom";

type Comment = { id: string; text: string; pending?: boolean };

const INITIAL: Comment[] = [{ id: "c1", text: "first" }];

function postComment(text: string): Promise<Comment> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (text.includes("fail")) reject(new Error("the server refused it"));
      else resolve({ id: crypto.randomUUID(), text });
    }, 300);
  });
}

/** Inside the form, so useFormStatus has a form to read. */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

export function ActionsAndOptimistic() {
  const [comments, setComments] = useState(INITIAL);

  const [shown, addOptimistic] = useOptimistic(comments, (current, text: string) => [
    ...current,
    { id: "optimistic", text, pending: true },
  ]);

  const [error, formAction] = useActionState<string | null, FormData>(async (_previous, data) => {
    const text = String(data.get("text") ?? "").trim();
    if (text === "") return "write something first";

    // On screen before the request leaves. React reverts it when this function
    // returns, by which point the real state has caught up (or has not, and the
    // optimistic row disappears).
    addOptimistic(text);

    try {
      const saved = await postComment(text);
      setComments((current) => [...current, saved]);
      return null;
    } catch (failure) {
      return (failure as Error).message;
    }
  }, null);

  return (
    <div className="stack">
      <ul data-testid="comments">
        {shown.map((comment) => (
          <li key={comment.id} style={{ opacity: comment.pending ? 0.5 : 1 }}>
            {comment.text}
            {comment.pending && <span className="note"> · sending</span>}
          </li>
        ))}
      </ul>

      <form action={formAction} className="row">
        <input name="text" aria-label="Comment" placeholder="say something" />
        <SubmitButton />
      </form>

      {error !== null && (
        <p role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <p className="note">
        Post anything: it appears at once, faded, then settles. Post something with “fail” in it: it
        appears, then vanishes when the server says no. No rollback code was written.
      </p>
    </div>
  );
}
