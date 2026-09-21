import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  FileUpload,
  IMAGE_RULE,
  formatBytes,
  mergeFiles,
  uploadWithProgress,
  validateFiles,
} from "./06_file_upload";

/** A File of a given size without allocating that many bytes for real. */
function fakeFile(name: string, bytes: number, type: string, lastModified = 1): File {
  const file = new File(["x"], name, { type, lastModified });
  // `size` is a getter on File, so it has to be redefined rather than assigned.
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

describe("the rules, without a DOM", () => {
  it("accepts a file inside every limit", () => {
    const ok = fakeFile("cat.png", 1024, "image/png");
    expect(validateFiles([ok], IMAGE_RULE)).toEqual([]);
  });

  it("rejects one that is too large, and says by how much", () => {
    const big = fakeFile("huge.png", 5 * 1024 * 1024, "image/png");
    expect(validateFiles([big], IMAGE_RULE)).toEqual([
      { file: "huge.png", reason: "5.0 MB is over the 2.0 MB limit" },
    ]);
  });

  it("rejects a type that is not on the list", () => {
    const pdf = fakeFile("cv.pdf", 1024, "application/pdf");
    expect(validateFiles([pdf], IMAGE_RULE)).toEqual([
      { file: "cv.pdf", reason: "application/pdf is not allowed" },
    ]);
  });

  it("names the missing type rather than printing an empty string", () => {
    // file.type is "" for an extension the OS does not recognise, which is
    // common enough that "  is not allowed" would reach a user.
    const unknown = fakeFile("data", 1024, "");
    expect(validateFiles([unknown], IMAGE_RULE)).toEqual([
      { file: "data", reason: "unknown type is not allowed" },
    ]);
  });

  it("rejects an empty file, which is usually a dragged directory", () => {
    const empty = fakeFile("folder", 0, "image/png");
    expect(validateFiles([empty], IMAGE_RULE)).toContainEqual({ file: "folder", reason: "empty" });
  });

  it("reports every problem rather than stopping at the first", () => {
    // Someone who picked four bad files wants one list, not four rounds.
    const problems = validateFiles(
      [
        fakeFile("a.pdf", 10, "application/pdf"),
        fakeFile("b.png", 9 * 1024 * 1024, "image/png"),
        fakeFile("c.png", 0, "image/png"),
        fakeFile("d.png", 10, "image/png"),
      ],
      IMAGE_RULE,
    );

    expect(problems.length).toBeGreaterThan(3);
    expect(problems.map((problem) => problem.file)).toContain("a.pdf");
    expect(problems.map((problem) => problem.file)).toContain("b.png");
  });

  it("counts the files against maxFiles", () => {
    const many = Array.from({ length: 4 }, (_, index) =>
      fakeFile(`${String(index)}.png`, 10, "image/png"),
    );
    expect(validateFiles(many, IMAGE_RULE)).toContainEqual({
      file: "4 files",
      reason: "at most 3",
    });
  });
});

describe("formatBytes", () => {
  it("does not print 0.0 KB for a small file", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("steps up through the units", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe("3.0 GB");
  });
});

describe("merging picks, because a FileList replaces rather than appends", () => {
  it("keeps what was already there", () => {
    const first = fakeFile("a.png", 10, "image/png");
    const second = fakeFile("b.png", 10, "image/png");

    const merged = mergeFiles([first], [second] as unknown as FileList);
    expect(merged.map((file) => file.name)).toEqual(["a.png", "b.png"]);
  });

  it("does not add the same file twice", () => {
    // Name, size and last-modified. File has no id, so this is the key every
    // uploader ends up using.
    const file = fakeFile("a.png", 10, "image/png", 99);
    const same = fakeFile("a.png", 10, "image/png", 99);

    expect(mergeFiles([file], [same] as unknown as FileList)).toHaveLength(1);
  });

  it("treats a same-named file with a different timestamp as a new one", () => {
    const original = fakeFile("a.png", 10, "image/png", 1);
    const edited = fakeFile("a.png", 10, "image/png", 2);

    expect(mergeFiles([original], [edited] as unknown as FileList)).toHaveLength(2);
  });

  it("returns a copy when the pick was cancelled", () => {
    // event.target.files is null when the dialog is dismissed, and dropping
    // the existing selection at that point is a real bug people ship.
    const existing = [fakeFile("a.png", 10, "image/png")];
    const merged = mergeFiles(existing, null);

    expect(merged).toEqual(existing);
    expect(merged).not.toBe(existing);
  });
});

describe("upload progress", () => {
  /**
   * XHR rather than fetch, because fetch still cannot report upload
   * progress. The test stubs XMLHttpRequest so the progress handler can be
   * driven without a server.
   */
  function stubXhr() {
    const instance = {
      open: vi.fn(),
      send: vi.fn(),
      abort: vi.fn(),
      upload: {} as { onprogress?: (event: ProgressEvent) => void },
      status: 200,
      responseText: "ok",
      onload: undefined as (() => void) | undefined,
      onerror: undefined as (() => void) | undefined,
      onabort: undefined as (() => void) | undefined,
    };
    // `function`, not an arrow. `uploadWithProgress` calls `new
    // XMLHttpRequest()`, and an arrow function has no [[Construct]] slot, so
    // the stub fails with "is not a constructor".
    vi.stubGlobal(
      "XMLHttpRequest",
      vi.fn(function (this: unknown) {
        return instance;
      }),
    );
    return instance;
  }

  it("reports percentages as the body goes out", async () => {
    const xhr = stubXhr();
    const seen: number[] = [];

    const pending = uploadWithProgress("/upload", new FormData(), (progress) =>
      seen.push(progress.percent),
    );

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 } as ProgressEvent);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 200 } as ProgressEvent);
    xhr.onload?.();

    await expect(pending).resolves.toBe("ok");
    expect(seen).toEqual([25, 100]);

    vi.unstubAllGlobals();
  });

  it("ignores a progress event whose total is unknown", async () => {
    // lengthComputable is false for a streamed body. Dividing by total here
    // is how a progress bar ends up at NaN%.
    const xhr = stubXhr();
    const seen: number[] = [];

    const pending = uploadWithProgress("/upload", new FormData(), (progress) =>
      seen.push(progress.percent),
    );

    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 50, total: 0 } as ProgressEvent);
    xhr.onload?.();

    await expect(pending).resolves.toBe("ok");
    expect(seen).toEqual([]);

    vi.unstubAllGlobals();
  });

  it("rejects on a non-2xx rather than resolving with the error page", async () => {
    const xhr = stubXhr();
    xhr.status = 413;

    const pending = uploadWithProgress("/upload", new FormData(), () => undefined);
    xhr.onload?.();

    await expect(pending).rejects.toThrow("upload failed: 413");
    vi.unstubAllGlobals();
  });

  it("aborts when the signal does", async () => {
    const xhr = stubXhr();
    const controller = new AbortController();

    const pending = uploadWithProgress(
      "/upload",
      new FormData(),
      () => undefined,
      controller.signal,
    );
    controller.abort();
    xhr.onabort?.();

    await expect(pending).rejects.toThrow("aborted");
    expect(xhr.abort).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("the component", () => {
  it("keeps files across two picks", async () => {
    const user = userEvent.setup();
    render(<FileUpload />);

    const input = screen.getByLabelText(/Images/);
    await user.upload(input, new File(["a"], "a.png", { type: "image/png" }));
    await user.upload(input, new File(["b"], "b.png", { type: "image/png" }));

    // The input itself would be holding one file. The component holds both.
    expect(screen.getByTestId("picked").children).toHaveLength(2);
  });

  it("removes one without dropping the others", async () => {
    const user = userEvent.setup();
    render(<FileUpload />);

    const input = screen.getByLabelText(/Images/);
    await user.upload(input, [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ]);

    await user.click(screen.getByRole("button", { name: "Remove a.png" }));

    expect(screen.getByTestId("picked").children).toHaveLength(1);
    expect(screen.getByTestId("picked")).toHaveTextContent("b.png");
  });

  it("blocks submit and names the problem when a file is rejected", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<FileUpload />);

    // `applyAccept: false` on purpose. user-event honours the `accept`
    // attribute and silently drops a file that does not match, which is a
    // fair imitation of the OS dialog and useless for testing the validation
    // behind it. A real user reaches this state by switching the dialog to
    // "All files" or by dragging the file in, and `accept` stops neither.
    await user.upload(
      screen.getByLabelText(/Images/),
      new File(["x"], "cv.pdf", { type: "application/pdf" }),
    );

    expect(screen.getByRole("button", { name: /Upload/ })).toBeDisabled();
    expect(screen.getByTestId("problems")).toHaveTextContent("application/pdf is not allowed");
  });

  it("marks the input invalid and points at the message", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<FileUpload />);

    const input = screen.getByLabelText(/Images/);
    await user.upload(input, new File(["x"], "cv.pdf", { type: "application/pdf" }));

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/not allowed/);
  });

  it("renders the error list even when it is empty", () => {
    // A live region that appears with its content is a new node, not a
    // change to a watched one, and it is announced by nobody.
    render(<FileUpload />);
    expect(screen.getByTestId("problems")).toBeEmptyDOMElement();
  });

  it("starts with submit disabled, because there is nothing to send", () => {
    render(<FileUpload />);
    expect(screen.getByRole("button", { name: /Upload/ })).toBeDisabled();
  });

  it("shows what `accept` does and does not do", async () => {
    render(<FileUpload />);
    const input = screen.getByLabelText(/Images/);
    const pdf = new File(["x"], "cv.pdf", { type: "application/pdf" });

    // user-event honours `accept` by default, which is a fair imitation of
    // the OS dialog: the file never arrives, and that is the whole of what
    // the attribute buys you.
    await userEvent.setup().upload(input, pdf);
    expect(screen.queryByTestId("picked")).not.toBeInTheDocument();

    // Bypassed, which any user can do by switching the dialog to "All files"
    // or by dragging the file in. Now it arrives, and validateFiles is what
    // stops it. That is the difference between a hint and a check.
    await userEvent.setup({ applyAccept: false }).upload(input, pdf);
    expect(screen.getByTestId("picked")).toHaveTextContent("cv.pdf");
    expect(screen.getByTestId("problems")).toHaveTextContent("not allowed");
  });
});
