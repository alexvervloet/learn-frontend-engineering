import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

/**
 * Imported, not reimplemented.
 *
 * The first version of this file declared its own copy of `safeNext`,
 * because the real one lived inside `app/actions.ts` and a `"use server"`
 * module cannot export a helper: every export there is a callable endpoint.
 * So the test guarded a duplicate, and the duplicate stayed correct while
 * the original was wrong. Moving the function to `lib/` was most of the fix.
 */
describe("where sign-in may send you", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/orders")).toBe("/orders");
    expect(safeNext("/cart")).toBe("/cart");
    expect(safeNext("/search?q=lamp")).toBe("/search?q=lamp");
    expect(safeNext("/products#top")).toBe("/products#top");
  });

  it("refuses an absolute URL", () => {
    expect(safeNext("https://evil.example")).toBe("/orders");
    expect(safeNext("http://evil.example/p")).toBe("/orders");
  });

  it("refuses a protocol-relative URL", () => {
    // A browser reads this as another origin, inheriting only the scheme.
    expect(safeNext("//evil.example")).toBe("/orders");
  });

  it("refuses a scheme with no origin", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/orders");
    expect(safeNext("data:text/html,<h1>hi")).toBe("/orders");
  });

  /**
   * The bug this file exists for.
   *
   * `startsWith("/") && !startsWith("//")` says yes to every one of these,
   * and every one of them leaves the site. Backslash is a path separator
   * for special schemes; tab, newline and carriage return are stripped
   * before the URL is parsed at all.
   */
  it("refuses the spellings a string check misses", () => {
    expect(safeNext("/\\evil.example")).toBe("/orders");
    expect(safeNext("/\\/evil.example")).toBe("/orders");
    expect(safeNext("/\t/evil.example")).toBe("/orders");
    expect(safeNext("/\n/evil.example")).toBe("/orders");
    expect(safeNext("/\r/evil.example")).toBe("/orders");
    expect(safeNext("\\\\evil.example")).toBe("/orders");
  });

  it("returns the parser's spelling, not the one that arrived", () => {
    // Validating one string and redirecting to another is how these get
    // reopened. What comes back is what `new URL` made of it.
    expect(safeNext("/cart/../orders")).toBe("/orders");
    expect(safeNext("//\\/evil.example")).toBe("/orders");
  });
});
