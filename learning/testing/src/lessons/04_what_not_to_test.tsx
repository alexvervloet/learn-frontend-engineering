/**
 * What not to test
 * ================
 * A test suite has a cost, and it is not the time it takes to write. It is that
 * every test is a claim you have to keep true. A test asserting something the
 * user cannot observe fails every time you refactor, teaches you nothing when
 * it does, and eventually gets deleted or `skip`ped by someone in a hurry.
 *
 * **Implementation details.** Internal state, private helpers, the number of
 * times a hook ran, class names, the shape of props passed to a child. All of
 * it can change while the component keeps working perfectly. The demo has two
 * tests of the same component: one asserts the CSS class of the active tab,
 * one asserts `aria-selected`. Rename the class and the first one fails and
 * nothing is broken. Remove `aria-selected` and the second fails and something
 * genuinely is.
 *
 * The test to write is the one that fails when the *user's* experience breaks.
 *
 * **Snapshots, mostly.** A snapshot of a whole component is a test nobody
 * reads: it fails on every intentional change, and the fix is to press `u`,
 * which is not review. They earn their place on small, stable, serialisable
 * things: a formatter's output, a generated query, an error message. Inline
 * snapshots are better than file ones, because the expected value is in front
 * of you in the diff.
 *
 * **The library, not your code.** A test that React Router navigates, that
 * Zod rejects a bad email, that Zustand notifies subscribers, is a test of
 * someone else's test suite. Test *your* schema's rules, *your* routes'
 * wiring.
 *
 * **Coverage is a signal, not a target.** It tells you which lines never ran.
 * It cannot tell you whether the assertions meant anything, and a suite of
 * `expect(render(<X />)).toBeTruthy()` reaches 100% while proving nothing. A
 * number below about 50% is worth investigating; a mandate for 95% mostly
 * produces tests written to reach 95%.
 *
 * The heuristic that survives: **would this test fail if the feature broke, and
 * pass if I rewrote how it works?** Both halves matter.
 */
import { useState } from "react";

const TABS = ["Overview", "Activity", "Settings"] as const;
type Tab = (typeof TABS)[number];

export function Tabs({ onSelect }: { onSelect?: (tab: Tab) => void }) {
  const [active, setActive] = useState<Tab>("Overview");

  function select(tab: Tab): void {
    setActive(tab);
    onSelect?.(tab);
  }

  return (
    <div>
      <div role="tablist" aria-label="Sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`tab-${tab}`}
            // The thing a screen reader reads, and the thing worth asserting.
            aria-selected={tab === active}
            aria-controls={`panel-${tab}`}
            tabIndex={tab === active ? 0 : -1}
            // The thing that is tempting to assert, and should not be.
            className={tab === active ? "tab tab--active" : "tab"}
            onClick={() => select(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`}>
        <p>{active} content</p>
      </div>
    </div>
  );
}

export function WhatNotToTest() {
  return (
    <div className="stack">
      <Tabs />

      <p className="note">
        Two tests of this component sit beside it. One breaks when the CSS class is renamed; the
        other breaks when the component stops being usable. Only one of them is worth having.
      </p>
    </div>
  );
}
