/**
 * Live regions
 * ============
 * A screen reader reads what is focused. Anything that changes somewhere else,
 * a save confirmation, a search result count, a validation error, an item added
 * to a basket, is silent unless you ask for it to be announced.
 *
 *   role="status"   or aria-live="polite". Waits for a pause. The default
 *                   choice for almost everything
 *   role="alert"    or aria-live="assertive". Interrupts immediately. For
 *                   things the user must hear now: a failed submit, a session
 *                   about to expire
 *   aria-live="off" the default for everything else, which is why silence is
 *                   the default
 *
 * **The region has to exist before the content does.** This is the bug, and it
 * catches everyone:
 *
 *   {message && <p role="status">{message}</p>}     often silent
 *   <p role="status">{message}</p>                  announced
 *
 * A screen reader registers live regions when they enter the accessibility
 * tree and then watches them for changes. A region that appears *with* its
 * content is a new node, not a change to a watched one, and support for
 * announcing that is inconsistent across screen readers. Render the container
 * always, empty, and change its text.
 *
 * The demo does both so you can hear the difference. The test asserts the
 * structural version of the same thing: the region is in the document before
 * anything has happened.
 *
 * **`aria-atomic="true"`** reads the whole region on any change, rather than
 * just the bit that changed. Right for "3 of 12 results", wrong for a log you
 * are appending to.
 *
 * **Assertive is a cost.** It cuts off whatever the user was listening to,
 * including their own typing being echoed. A polite region that announces a
 * second later is almost always better. If everything is assertive, the user
 * turns the page off.
 *
 * **Do not put a live region on something that changes constantly.** A
 * character counter marked `polite` is announced on every keystroke, which is
 * unusable. Debounce it, or only announce at the boundaries that matter: 20
 * characters left, limit reached.
 */
import { useEffect, useRef, useState } from "react";

const RESULTS = ["react", "reducer", "ref", "render", "resume"];

export function LiveRegions() {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [conditionalMessage, setConditionalMessage] = useState<string | null>(null);

  // Debounced, so the count is not announced on every keystroke.
  const [announcedCount, setAnnouncedCount] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const matches = query === "" ? [] : RESULTS.filter((item) => item.startsWith(query));

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setAnnouncedCount(query === "" ? "" : `${matches.length} results for ${query}`);
    }, 500);

    return () => clearTimeout(timer.current);
  }, [query, matches.length]);

  return (
    <div className="stack">
      <h3>A search count, announced politely</h3>
      <label className="row">
        Search
        <input
          aria-label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {/* Always rendered, empty to start. This is the part people get wrong. */}
      <p role="status" aria-atomic="true" data-testid="count-region" className="note">
        {announcedCount}
      </p>

      <ul data-testid="results">
        {matches.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3>Polite and assertive</h3>
      <div className="row">
        <button onClick={() => setSaved(`Saved at ${new Date().toLocaleTimeString()}`)}>
          Save (polite)
        </button>
        <button onClick={() => setFailed("Could not save. Check your connection.")}>
          Fail (assertive)
        </button>
      </div>

      {/* Both containers exist from the first render. */}
      <p role="status" data-testid="saved-region">
        {saved}
      </p>
      <p role="alert" data-testid="failed-region" style={{ color: "var(--danger)" }}>
        {failed}
      </p>

      <h3>The version that is often silent</h3>
      <button onClick={() => setConditionalMessage(`Saved at ${new Date().toLocaleTimeString()}`)}>
        Save (conditionally rendered region)
      </button>
      {conditionalMessage !== null && (
        <p role="status" data-testid="conditional-region">
          {conditionalMessage}
        </p>
      )}

      <p className="note">
        With a screen reader running, the first Save is announced and the third often is not: the
        region and its content appeared together, so there was no change to a watched node.
      </p>
    </div>
  );
}
