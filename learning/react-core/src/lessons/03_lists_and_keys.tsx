/**
 * Lists and keys
 * ==============
 * A key tells React which item in the new list is the same item as one in the
 * old list. Get it wrong and React does not crash. It does something worse: it
 * keeps the state of the item that used to be in that position and hands it to
 * a different item.
 *
 * The array index is the default people reach for, and it is fine only when the
 * list never reorders, never has items removed from the middle, and never has
 * items inserted anywhere but the end. In other words, when the index *is* a
 * stable identity. Most lists are not like that.
 *
 * The demo has two identical lists side by side, each row holding some state of
 * its own (what you typed). Type into the second row of both, then delete the
 * first row:
 *
 *   keyed by index   the text you typed moves up to a different person
 *   keyed by id      the text goes with the row it belongs to
 *
 * A DOM input is the clearest version of this because you can see it, but the
 * same thing happens to `useState` inside a row component, to scroll position,
 * to an open/closed toggle, and to a CSS transition that was halfway through.
 */
import { useState } from "react";

type Person = { id: number; name: string };

const INITIAL: Person[] = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Grace" },
  { id: 3, name: "Linus" },
];

/** One row. The `<input>` holds state React knows nothing about, which is the point. */
function Row({ person, testId }: { person: Person; testId: string }) {
  return (
    <li className="row">
      <span style={{ width: "4rem" }}>{person.name}</span>
      <input aria-label={`note for ${person.name}`} data-testid={testId} placeholder="a note" />
    </li>
  );
}

export function ListsAndKeys() {
  const [people, setPeople] = useState(INITIAL);

  return (
    <div className="stack">
      <div className="row">
        <button onClick={() => setPeople((current) => current.slice(1))}>
          Remove the first row
        </button>
        <button onClick={() => setPeople(INITIAL)}>Reset</button>
      </div>

      <div className="row" style={{ alignItems: "flex-start", gap: "2.5rem" }}>
        <div>
          <h3>key={"{index}"}</h3>
          <ul className="stack">
            {people.map((person, index) => (
              <Row key={index} person={person} testId={`by-index-${person.id}`} />
            ))}
          </ul>
        </div>

        <div>
          <h3>key={"{person.id}"}</h3>
          <ul className="stack">
            {people.map((person) => (
              <Row key={person.id} person={person} testId={`by-id-${person.id}`} />
            ))}
          </ul>
        </div>
      </div>

      <p className="note">
        Type something into Grace’s box in both lists, then remove the first row. On the left the
        note is now against Linus. On the right it stayed with Grace.
      </p>
    </div>
  );
}
