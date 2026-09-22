// @vitest-environment node
import { Suspense } from "react";
import { describe, expect, it } from "vitest";

import { PRODUCTS, ProductList, Shell } from "./page";
import { renderStream } from "./stream";

/** A component that suspends on a promise, the way a data-loading one does. */
function makeSlowSection(delayMs: number, text: string) {
  let status: "pending" | "done" = "pending";
  const promise = new Promise<void>((resolve) =>
    setTimeout(() => {
      status = "done";
      resolve();
    }, delayMs),
  );

  return function SlowSection() {
    if (status === "pending") throw promise;
    return <p data-testid="slow">{text}</p>;
  };
}

describe("streaming", () => {
  it("sends the shell before the slow part is ready", async () => {
    const Slow = makeSlowSection(50, "arrived late");

    const { chunks, html } = await renderStream(
      <Shell title="Products">
        <ProductList products={PRODUCTS} />
        <Suspense fallback={<p data-testid="fallback">loading…</p>}>
          <Slow />
        </Suspense>
      </Shell>,
    );

    // More than one chunk is the whole point: the browser painted the first
    // one while the server was still working on the rest.
    expect(chunks.length).toBeGreaterThan(1);

    const first = chunks[0] ?? "";
    expect(first).toContain("<h1>Products</h1>");
    expect(first).toContain("loading…");
    expect(first).not.toContain("arrived late");

    // And it all arrives in the end, in the same response.
    expect(html).toContain("arrived late");
  });

  it("puts the fast content in the shell, not behind the slow part", async () => {
    const Slow = makeSlowSection(50, "late");

    const { chunks } = await renderStream(
      <Shell title="Products">
        <ProductList products={PRODUCTS} />
        <Suspense fallback={<p>loading…</p>}>
          <Slow />
        </Suspense>
      </Shell>,
    );

    // Everything outside the Suspense boundary is in the first flush. This is
    // why boundary placement is a performance decision.
    expect(chunks[0]).toContain("Keyboard");
  });

  it("waits for everything when asked, which is renderToString with extra steps", async () => {
    const Slow = makeSlowSection(30, "all of it");

    const { chunks, html } = await renderStream(
      <Suspense fallback={<p>loading…</p>}>
        <Slow />
      </Suspense>,
      { waitForAll: true },
    );

    // One flush, because nothing was left to wait for. Right for a crawler or
    // a static prerender; wrong for a user.
    expect(chunks).toHaveLength(1);
    expect(html).toContain("all of it");
  });

  /**
   * The two halves of "when did it throw", which is the only question that
   * decides what a server can do about it.
   *
   * Same error, same component, one `<Suspense>` boundary apart. Inside one,
   * the shell is already out, the status line is gone and all that is left is
   * a fallback on screen and a line in the logs. Outside every boundary, the
   * shell never rendered, nothing was written, and the server can still answer
   * 500 properly.
   *
   * The first version of this file tested only the second case and described
   * the first in a comment, which left the recoverable half of the lesson as
   * prose.
   */
  it("fails the whole response when the shell itself throws", async () => {
    function Throws(): never {
      throw new Error("the shell exploded");
    }

    // No Suspense boundary, so there is no shell without this component.
    const result = await renderStream(
      <Shell title="Products">
        <Throws />
      </Shell>,
    );

    expect(result.status).toBe(500);
    expect((result.shellError as Error).message).toBe("the shell exploded");

    // Nothing went out, which is exactly why a 500 is still available.
    expect(result.html).toBe("");
    expect(result.chunks).toHaveLength(0);
  });

  it("reports an error after the shell instead of failing the response", async () => {
    function Throws(): never {
      throw new Error("the slow part exploded");
    }

    const { status, html, errors } = await renderStream(
      <Shell title="Products">
        <ProductList products={PRODUCTS} />
        <Suspense fallback={<p>loading…</p>}>
          <Throws />
        </Suspense>
      </Shell>,
    );

    // The status line was sent long ago, so this cannot become a 500. onError
    // is the only place you will ever hear about it.
    expect(status).toBe(200);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe("the slow part exploded");
    // The rest of the page still went out.
    expect(html).toContain("Keyboard");
  });
});
