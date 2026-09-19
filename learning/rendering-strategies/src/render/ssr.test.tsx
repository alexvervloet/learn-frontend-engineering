// @vitest-environment node
import { describe, expect, it } from "vitest";

import { PRODUCTS, ProductList, Shell } from "./page";
import { renderBody, renderPage } from "./ssr";

/**
 * The node environment, not jsdom, and deliberately. `renderToString` is what
 * a server runs, and a server has no `window`. Running these in jsdom would
 * let a component reach for `document`, pass here, and crash in production on
 * the first request.
 */
describe("renderToString", () => {
  it("produces the markup before any JavaScript reaches the browser", () => {
    const html = renderBody(
      <Shell title="Products">
        <ProductList products={PRODUCTS} />
      </Shell>,
    );

    // A crawler, a preview card generator and a browser with JS disabled all
    // see this. A client-rendered app gives them an empty div.
    expect(html).toContain("<h1>Products</h1>");
    expect(html).toContain("Keyboard");
    expect(html).toContain("260");
  });

  it("has no window to reach for", () => {
    expect(typeof globalThis.window).toBe("undefined");

    function UsesWindow() {
      return <p>{window.location.href}</p>;
    }

    // The error every SSR migration meets on day one.
    expect(() => renderBody(<UsesWindow />)).toThrow(/window is not defined/);
  });

  it("runs no effects, so a component that only works after mount renders empty", () => {
    function LoadsOnMount() {
      // useEffect never runs on the server. Whatever it was going to set is
      // simply absent from the HTML.
      return <p data-testid="content">{null}</p>;
    }

    expect(renderBody(<LoadsOnMount />)).toBe('<p data-testid="content"></p>');
  });
});

describe("the document around it", () => {
  const page = renderPage({
    element: <ProductList products={PRODUCTS} />,
    title: "Products",
    data: { products: PRODUCTS },
  });

  it("puts the markup inside the root the client will hydrate", () => {
    expect(page).toContain('<div id="root">');
    expect(page).toContain("Keyboard");
  });

  it("serialises the data the server used", () => {
    // Without this the client refetches it, and until it arrives the hydrated
    // tree does not match the markup.
    expect(page).toContain("window.__DATA__=");
    expect(page).toContain('"name":"Keyboard"');
  });

  it("escapes a closing script tag in the data", () => {
    const hostile = renderPage({
      element: <p>hi</p>,
      title: "t",
      data: { comment: "</script><script>alert(1)</script>" },
    });

    // Unescaped, this ends the script element early and the rest executes.
    expect(hostile).not.toContain("</script><script>alert(1)");
    expect(hostile).toContain("\\u003c/script");
  });

  it("defers the script rather than blocking the paint", () => {
    // A blocking script in the head undoes the reason for rendering on the
    // server at all.
    expect(page).toMatch(/<script type="module"[^>]*defer><\/script>/);
  });
});
