/**
 * Where the types stop being true
 * ===============================
 * Every type in a React app is a claim about data the compiler has never seen.
 * At the boundary, the claim is either checked or it is not.
 *
 * **`as` is not a conversion. It is you overruling the compiler.**
 *
 *   const bookmark = JSON.parse(text) as Bookmark;
 *
 * Nothing is verified. `JSON.parse` returns `any`, and the assertion paints a
 * type onto it. From that line on, the editor autocompletes `bookmark.title`
 * with total confidence, and the first thing that touches it throws
 * `Cannot read properties of undefined`. The stack trace points at the render,
 * not at the parse, which is why this costs an hour rather than a minute.
 *
 * **`satisfies` is the one you usually wanted.** It checks a value against a
 * type without replacing the value's own type with it:
 *
 *   const ROUTES: Record<string, string> = { home: "/", about: "/about" };
 *   ROUTES.typo    // string. No error. The annotation said every string key
 *                  // is a string, so it is
 *
 *   const ROUTES = { home: "/", about: "/about" } satisfies Record<string, string>;
 *   ROUTES.typo    // error: `typo` does not exist
 *
 * The annotation checks and then *becomes* the type. `satisfies` checks and
 * leaves the inferred type in place, so the exact key set survives and so does
 * autocomplete.
 *
 * It does not, on its own, keep literal *values*: `Record<string, string>` gives
 * the values a contextual type of `string`, so `ROUTES.home` is `string`. When
 * you want `"/"`, combine the two:
 *
 *   const ROUTES = { home: "/" } as const satisfies Record<string, string>;
 *
 * `as const` makes the literals stick; `satisfies` checks them. That pairing is
 * the one to remember.
 *
 * **`unknown` is the honest type for foreign data.** `any` switches the checker
 * off and spreads: one `any` in a chain makes everything downstream `any` too.
 * `unknown` is assignable from anything and assignable *to* nothing until you
 * narrow it, which is exactly the discipline you want on a response body.
 *
 * **So validate at the boundary, once.** A schema gives you a runtime check and
 * a type from the same declaration, so the two cannot drift:
 *
 *   const Bookmark = z.object({ … });
 *   type Bookmark = z.infer<typeof Bookmark>;
 *
 * Inside the boundary, types are trustworthy and `as` is never needed. Outside
 * it, nothing is trusted. The three legitimate uses of `as` left over: narrowing
 * a value you have already checked another way, `as const`, and the contained
 * cast inside a polymorphic component from lesson 05.
 */
import { useState } from "react";
import * as z from "zod";

const BookmarkSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "title cannot be empty"),
  votes: z.number().int().nonnegative(),
});

// One declaration, two outputs: a runtime check and a compile-time type.
export type Bookmark = z.infer<typeof BookmarkSchema>;

/** The version that asserts. Compiles, and lies. */
export function trust(text: string): Bookmark {
  // JSON.parse returns `any`, so this assertion is unchecked in both directions.
  return JSON.parse(text) as Bookmark;
}

export type Checked = { ok: true; value: Bookmark } | { ok: false; problems: string[] };

/** The version that checks. */
export function check(text: string): Checked {
  let raw: unknown;
  try {
    // Annotated `unknown`, not left as `any`. Now nothing can be read off it
    // until it has been through the schema.
    raw = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["that is not JSON"] };
  }

  const result = BookmarkSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      problems: result.error.issues.map((issue) =>
        issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message,
      ),
    };
  }

  return { ok: true, value: result.data };
}

// `satisfies` rather than an annotation: every value is checked against the
// wider type, and the keys stay literal, so PRESETS.valid is known to exist and
// PRESETS.vaild is an error.
const PRESETS = {
  valid: '{ "id": "1", "title": "Rules of React", "votes": 12 }',
  wrongType: '{ "id": "1", "title": "Rules of React", "votes": "twelve" }',
  missing: '{ "id": "1" }',
  notJson: "definitely not json",
} satisfies Record<string, string>;

export function AsAndSatisfies() {
  const [text, setText] = useState(PRESETS.valid);
  const [trusted, setTrusted] = useState<string | null>(null);
  const [checked, setChecked] = useState<Checked | null>(null);

  function runTrust(): void {
    try {
      const bookmark = trust(text);
      // The line that throws. TypeScript is certain `title` is a string.
      setTrusted(`${bookmark.title.toUpperCase()} · ${bookmark.votes + 1} votes`);
    } catch (error) {
      setTrusted(`threw at the point of use: ${(error as Error).message}`);
    }
  }

  return (
    <div className="stack">
      <div className="row">
        {Object.entries(PRESETS).map(([name, preset]) => (
          <button key={name} onClick={() => setText(preset)}>
            {name}
          </button>
        ))}
      </div>

      <textarea
        aria-label="JSON"
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        style={{ width: "100%", fontFamily: "var(--mono)" }}
      />

      <div className="row">
        <button onClick={runTrust}>Parse with `as`</button>
        <button onClick={() => setChecked(check(text))}>Parse with a schema</button>
      </div>

      <pre className="log" data-testid="trusted">
        {trusted ?? "as: not run"}
      </pre>
      <pre className="log" data-testid="checked">
        {checked === null
          ? "schema: not run"
          : checked.ok
            ? `ok: ${checked.value.title} (${checked.value.votes})`
            : checked.problems.join("\n")}
      </pre>

      <p className="note">
        Press “wrongType”, then both buttons. The assertion produces a number by
        string-concatenating and never complains; the schema names the field and what was wrong with
        it.
      </p>
    </div>
  );
}
