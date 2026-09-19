import { ReviewForm } from "@/components/ReviewForm";
import { addedReviews } from "@/lib/data";

/**
 * Server actions
 * ==============
 * A form that posts to a function instead of to an API route:
 *
 *   <form action={submitReview}>
 *
 * There is no fetch, no JSON, no endpoint to write, no client state to hold
 * the request in flight. Next generates the endpoint and the client reference.
 *
 * **It works without JavaScript.** Before hydration, and with scripting
 * disabled entirely, the form is a real `<form>` that posts and the page
 * re-renders with the result. This is progressive enhancement as the default
 * rather than as an extra effort, and the e2e suite asserts it with JavaScript
 * turned off.
 *
 * **`useActionState` is the client-side half**, and it is React's, not Next's:
 * the same hook the react-core module used with a plain function. It gives you
 * the action's return value and a pending flag, and degrades to a plain form
 * when there is no JavaScript.
 *
 * **Every action is a public endpoint.** Validate and authorise inside the
 * action. The form's `minLength` is a hint to the person typing; the check in
 * `actions.ts` is the one that matters.
 *
 * **`revalidatePath` is not optional.** The rendered page is cached, so
 * without it the action succeeds and the screen does not change.
 */
export default function ActionsPage() {
  const reviews = addedReviews("keyboard");

  return (
    <main>
      <h1>Server actions</h1>

      <p className="note">
        The form below posts to a function in <code>app/actions/actions.ts</code>. There is no API
        route anywhere in this project.
      </p>

      <ReviewForm />

      <h2>Reviews so far</h2>
      <ul data-testid="added-reviews">
        {reviews.length === 0 && <li className="note">none yet</li>}
        {reviews.map((review) => (
          <li key={review}>{review}</li>
        ))}
      </ul>
    </main>
  );
}
