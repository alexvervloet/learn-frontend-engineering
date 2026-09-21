/**
 * File inputs, and the four things that make them different
 * =========================================================
 * A file input looks like any other field and behaves like none of them.
 *
 * **It is always uncontrolled.** You cannot set `value` on it. A page that
 * could put a path into a file input could read any file on your disk, so the
 * platform forbids it: assigning anything but `""` throws. `""` is allowed, and
 * clearing the input is the one thing you can do. Every "remove this file"
 * button is either that, or a `DataTransfer` object swapped into `input.files`.
 *
 * **What you get is a `FileList`, not an array.** Array-like, no `map`, and it
 * is live in the sense that it is replaced wholesale on each pick rather than
 * appended to. Selecting three files and then one more leaves you with one.
 * Accumulating across picks is your job, and the demo does it.
 *
 * **`accept` is a filter, not a check.** It decides what the OS dialog shows by
 * default, and a determined user switches it to "All files" or drags something
 * in. Validate after the pick, and validate again on the server, because the
 * client's `file.type` comes from the file extension on most platforms and is
 * trivially wrong.
 *
 * **The bytes never touch JSON.** `JSON.stringify(file)` is `{}`. Uploads go as
 * `multipart/form-data`, which is what `new FormData(form)` produces and what
 * `<form encType="multipart/form-data">` does without any JavaScript at all.
 * Sending base64 in a JSON body works and costs you a third more bytes plus the
 * whole file in memory twice.
 *
 * **Progress needs XHR, still.** `fetch` has no upload progress event. It is
 * `XMLHttpRequest.upload.onprogress` or nothing, in 2026, because a request
 * body is a stream that `fetch` cannot report on. `uploadWithProgress` below is
 * the twenty lines everyone ends up writing.
 *
 * The validation here is deliberately not React Hook Form's. RHF registers a
 * file input fine, but the interesting rules are about the `File` objects
 * rather than about the field, so they live in `validateFiles`, which is a pure
 * function and testable without a DOM.
 */
import { useId, useRef, useState } from "react";

export type FileRule = {
  /** Bytes. The server has its own limit and it is the one that counts. */
  maxBytes: number;
  maxFiles: number;
  /** MIME types. Checked, but see the note about `accept` above. */
  accept: readonly string[];
};

export const IMAGE_RULE: FileRule = {
  maxBytes: 2 * 1024 * 1024,
  maxFiles: 3,
  accept: ["image/png", "image/jpeg", "image/webp"],
};

export type FileProblem = { file: string; reason: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit] ?? "KB"}`;
}

/**
 * Every rule that can be checked before a byte is sent.
 *
 * Returns the problems rather than throwing on the first, because a person who
 * picked five files wants to know about all five, not to fix them one at a
 * time.
 */
export function validateFiles(files: readonly File[], rule: FileRule): FileProblem[] {
  const problems: FileProblem[] = [];

  if (files.length > rule.maxFiles) {
    problems.push({
      file: `${String(files.length)} files`,
      reason: `at most ${String(rule.maxFiles)}`,
    });
  }

  for (const file of files) {
    if (file.size > rule.maxBytes) {
      problems.push({
        file: file.name,
        reason: `${formatBytes(file.size)} is over the ${formatBytes(rule.maxBytes)} limit`,
      });
    }

    // An empty file is usually a failed drag or a directory, and it will fail
    // on the server anyway. Better to say so here.
    if (file.size === 0) {
      problems.push({ file: file.name, reason: "empty" });
    }

    if (!rule.accept.includes(file.type)) {
      problems.push({
        file: file.name,
        reason: `${file.type === "" ? "unknown type" : file.type} is not allowed`,
      });
    }
  }

  return problems;
}

/**
 * A FileList is not an array and a second pick replaces the first.
 *
 * So "add more" is a merge, and the merge needs a key. Name plus size plus
 * last-modified is what every library uses, because `File` has no id and two
 * genuinely different files almost never agree on all three.
 */
export function mergeFiles(existing: readonly File[], picked: FileList | null): File[] {
  if (picked === null) return [...existing];

  const key = (file: File) => `${file.name}:${String(file.size)}:${String(file.lastModified)}`;
  const seen = new Set(existing.map(key));

  // Array.from, because FileList has no map, filter or spread-friendly
  // iterator on older engines. `[...files]` works today; `Array.from` has
  // always worked.
  const additions = Array.from(picked).filter((file) => !seen.has(key(file)));

  return [...existing, ...additions];
}

export type UploadProgress = { loaded: number; total: number; percent: number };

/**
 * `fetch` cannot report upload progress. This is why XHR is still here.
 *
 * Resolves with the response text, rejects on a network failure or a non-2xx.
 * `onProgress` fires as the body goes out; note that it reports bytes handed
 * to the socket, not bytes the server has processed, so it reaches 100% before
 * the response comes back.
 */
export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", url);

    request.upload.onprogress = (event) => {
      // `lengthComputable` is false when the body size is unknown, which
      // happens with a stream. A progress bar that assumes otherwise jumps to
      // NaN%.
      if (!event.lengthComputable) return;
      onProgress({
        loaded: event.loaded,
        total: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve(request.responseText);
      else reject(new Error(`upload failed: ${String(request.status)}`));
    };
    request.onerror = () => reject(new Error("network error"));
    request.onabort = () => reject(new DOMException("aborted", "AbortError"));

    signal?.addEventListener("abort", () => request.abort(), { once: true });

    request.send(body);
  });
}

/* ------------------------------------------------------------------ */

export function FileUpload() {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [problems, setProblems] = useState<FileProblem[]>([]);
  const [percent, setPercent] = useState<number | null>(null);

  function pick(picked: FileList | null): void {
    const merged = mergeFiles(files, picked);
    setFiles(merged);
    setProblems(validateFiles(merged, IMAGE_RULE));

    // Clear the input so picking the same file again still fires `change`.
    // Without this, remove-then-re-add does nothing and looks broken.
    if (inputRef.current !== null) inputRef.current.value = "";
  }

  function remove(target: File): void {
    const next = files.filter((file) => file !== target);
    setFiles(next);
    setProblems(validateFiles(next, IMAGE_RULE));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (problems.length > 0 || files.length === 0) return;

    const body = new FormData();
    for (const file of files) body.append("images", file);

    setPercent(0);
    try {
      // There is no server here, so this is a data: URL that accepts nothing.
      // The point is the shape of the call, and lesson 05's MSW setup in
      // data-fetching is where a real endpoint would be mocked.
      await uploadWithProgress("/upload", body, (progress) => setPercent(progress.percent));
    } catch {
      // Expected: nothing is listening. The progress bar still moved.
    } finally {
      setPercent(null);
    }
  }

  return (
    <form className="stack" onSubmit={(event) => void submit(event)} noValidate>
      <label htmlFor={inputId}>
        Images (PNG, JPEG or WebP, up to {formatBytes(IMAGE_RULE.maxBytes)} each, {""}
        {IMAGE_RULE.maxFiles} at most)
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        multiple
        // A hint to the file dialog, not a guarantee. validateFiles is the check.
        accept={IMAGE_RULE.accept.join(",")}
        aria-describedby={problems.length > 0 ? errorId : undefined}
        aria-invalid={problems.length > 0}
        onChange={(event) => pick(event.target.files)}
      />

      {files.length > 0 && (
        <ul className="stack" data-testid="picked">
          {files.map((file) => (
            <li key={`${file.name}:${String(file.size)}:${String(file.lastModified)}`}>
              {file.name} <span className="note">{formatBytes(file.size)}</span>{" "}
              <button type="button" onClick={() => remove(file)}>
                Remove {file.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
        Rendered always, empty when there is nothing to say. A live region
        that appears with its content is a new node rather than a change to a
        watched one, and screen readers stay silent. Same bug as the
        accessibility module's live-regions lesson.
      */}
      <ul id={errorId} className="stack" role="alert" data-testid="problems">
        {problems.map((problem) => (
          <li key={`${problem.file}:${problem.reason}`}>
            {problem.file}: {problem.reason}
          </li>
        ))}
      </ul>

      {percent !== null && (
        <p>
          {/* A real progress element, so it is announced and styleable. */}
          <progress value={percent} max={100} data-testid="progress">
            {percent}%
          </progress>{" "}
          {percent}%
        </p>
      )}

      <div className="row">
        <button type="submit" disabled={files.length === 0 || problems.length > 0}>
          Upload {files.length === 0 ? "" : String(files.length)}
        </button>
      </div>

      <p className="note">
        Pick a file, then pick a different one. Both stay, because the component merges rather than
        replacing. That is not what the input does on its own.
      </p>
    </form>
  );
}
