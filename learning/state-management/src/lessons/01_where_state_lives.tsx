/**
 * Where state belongs
 * ===================
 * Most "we need a state manager" conversations are really about one of four
 * questions being answered wrong. In order of how often they should be reached
 * for:
 *
 *   useState in the component   nobody else needs it. An open dropdown, a
 *                               draft, a hover. Start here, always
 *   lifted to a common parent   two siblings need it. Move it up one level, and
 *                               only one level
 *   the URL                     a filter, a tab, a page, a query. Shareable,
 *                               reloadable, back-button-able. See the routing
 *                               module
 *   a store                     many components, far apart, and lifting would
 *                               mean putting it at the root and threading it
 *                               down through things that do not care
 *
 * **Server data is not client state.** The biggest single mistake is copying
 * API responses into a store. Once you do, you own caching, invalidation,
 * staleness, retries, deduplication and refetch-on-focus, and you will
 * reimplement all of them badly. Server data belongs in a query cache, and
 * TanStack Query in the data-fetching module is what that looks like. What is
 * left over for a store is genuinely client-owned: a shopping basket before
 * checkout, an editor's undo stack, which panels are open, the theme, an
 * optimistic queue.
 *
 * After that split, most applications need much less global state than they
 * think. A big chunk of what is in a typical Redux store is a cached API
 * response.
 *
 * **Lifting has a cost, and it is not the boilerplate.** State lifted to a
 * parent re-renders that parent and therefore its entire subtree, including
 * every sibling that does not care. The demo shows it: typing in a field lifted
 * to the parent re-renders both panels, though only one is reading it. That is
 * the specific pain a store removes, and lesson 02 is about how.
 *
 * The honest summary: reach for a store when the state is client-owned, read in
 * several distant places, and updated often enough that the re-renders matter.
 * Two out of three is usually not enough.
 */
import { useState } from "react";

import { useRenderCount } from "../useRenderCount";

function ReadsTheName({ name }: { name: string }) {
  const renders = useRenderCount();

  return (
    <p>
      Hello {name === "" ? "stranger" : name} ·{" "}
      <span className="note" data-testid="reader-renders">
        {renders}
      </span>{" "}
      renders
    </p>
  );
}

function IgnoresTheName() {
  const renders = useRenderCount();

  return (
    <p>
      This panel never reads the name ·{" "}
      <span className="note" data-testid="bystander-renders">
        {renders}
      </span>{" "}
      renders
    </p>
  );
}

/** State lifted to the parent, which is the default advice and has a cost. */
export function Lifted() {
  const [name, setName] = useState("");

  return (
    <div className="stack">
      <label className="row">
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} aria-label="Name" />
      </label>

      <ReadsTheName name={name} />
      {/* Re-renders on every keystroke, though it reads nothing. */}
      <IgnoresTheName />
    </div>
  );
}

export function WhereStateLives() {
  return (
    <div className="stack">
      <h3>The cost of lifting</h3>
      <Lifted />

      <p className="note">
        Type a character. Both counters go up. The second panel does not read the name and has no
        reason to re-render, but its parent did, so it did too.
      </p>

      <h3>The decision, in order</h3>
      <ol>
        <li>
          <strong>Local.</strong> Nobody else needs it.
        </li>
        <li>
          <strong>Lifted.</strong> Two siblings need it. Up one level, not to the root.
        </li>
        <li>
          <strong>The URL.</strong> Anyone would want to link to it.
        </li>
        <li>
          <strong>A query cache.</strong> It came from a server.
        </li>
        <li>
          <strong>A store.</strong> Client-owned, read far apart, updated often.
        </li>
      </ol>
    </div>
  );
}
