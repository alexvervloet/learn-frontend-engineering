# Forms 🟢

Six lessons: who owns the value, the library almost everyone reaches for, one
schema doing two jobs, errors a screen reader can actually find, the two things
that go wrong with dynamic fields, and the field that plays by none of the
rules.

## What the files cover

| File                             | What it teaches                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `01_controlled_uncontrolled.tsx` | Controlled costs a render per keystroke and can show a live count. Uncontrolled costs nothing and cannot. Both measured       |
| `02_react_hook_form.tsx`         | Uncontrolled with validation attached. The `formState` Proxy decides what re-renders, and `mode` decides when validation nags |
| `03_zod_validation.tsx`          | One schema giving the runtime check, the type, and something the server imports. `.refine` needs a `path`                     |
| `04_accessible_errors.tsx`       | `aria-invalid`, `aria-describedby`, a focused summary, and never colour alone                                                 |
| `05_field_arrays.tsx`            | `key={field.id}` not the index, debounced async checks, and why the server still decides                                      |
| `06_file_upload.tsx`             | A field you cannot control, a `FileList` that replaces rather than appends, `accept` as a hint, and progress that needs XHR   |

## Run it

```bash
npm install                   # from the repo root, once
npm run dev -w learning/forms   # http://localhost:5177
npm test -- --project forms
```

## The short version

**Uncontrolled unless something needs the value as it is typed.** A live
character count, a search that filters as you go, a field that formats itself,
one field driving another: those need controlled. Most forms need none of them,
and pay a full subtree re-render per keystroke for nothing.

**Validate with a schema, and import it on the server.** Rules written inline
in `register` exist in one component, get rewritten differently on the server,
and drift. The client copy is a courtesy to the person typing; it is never the
check.

**Every error needs four things**: `aria-invalid` on the field,
`aria-describedby` pointing at the message, focus moved somewhere useful on
submit, and words rather than just a red border.

## Two things the tests caught

**The summary ref is null in `handleSubmit`'s error callback.** That callback
runs before React has re-rendered, so the error summary does not exist yet and
`summaryRef.current?.focus()` silently does nothing. The errors appear, focus
stays on the button, and a keyboard user is told something failed with no idea
where. It is an effect keyed on `submitCount` instead.

**React Hook Form re-renders once while you type fifteen characters**, not zero.
The one render is `isDirty` flipping false to true, and this form reads
`isDirty` to show an unsaved-changes note, so the `formState` Proxy subscribed
it. The first version of the test asserted zero and failed. Whether you want
that subscription is a real decision; the number is not noise.

## Testing forms

`getByLabelText` and `getByRole("textbox", { name })` throughout, not test ids.
That is not purity: a field a test cannot find by its label is a field a screen
reader cannot announce, so the query doubles as an accessibility assertion. The
one place test ids appear is the render counters, which are instrumentation
rather than UI.

Async validation needs generous `findBy` timeouts. The demo debounces by 300ms
before a 150ms request, so a 1000ms default is not always enough on a loaded CI
machine.

## Why the upload lesson does not use React Hook Form

RHF registers a file input perfectly well. The interesting rules here are not
about the field, they are about the `File` objects behind it: size, type,
count, and how to merge two picks. Those live in `validateFiles` and
`mergeFiles`, which are pure functions with no form library near them, and the
suite tests them without rendering anything.

The part worth copying is what the tests say about `accept`. It filters the OS
dialog and nothing else. `user-event` honours the attribute by default, so the
file never arrives; with `applyAccept: false` it arrives and `validateFiles` is
what stops it. The second case is a user switching the dialog to "All files",
which takes one click.

`fetch` still cannot report upload progress, so `uploadWithProgress` is
`XMLHttpRequest`. That is not a legacy detail to skip past: it is the reason
every upload widget in every codebase has an XHR in it somewhere.

## Not covered here

`useActionState` and form actions (react-core lesson 10 covers those),
multi-step wizards and their state, optimistic form submission, resumable and
chunked uploads, presigned direct-to-storage URLs, drag-and-drop as a second
entry point, and server-returned field errors mapped back onto the form with
`setError`. The last one is worth doing in the capstone, where there is a real
server to disagree with.
