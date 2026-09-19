import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";

import { documentHtml } from "./page";

/**
 * The whole of server rendering, in one function.
 *
 * `renderToString` walks the tree once and returns markup. It is synchronous,
 * it cannot wait for anything, and a component that suspends renders its
 * fallback and nothing more. That is the limitation `renderToReadableStream`
 * removes, and it is why the streaming lesson exists.
 *
 * Note what it does *not* do: no effects run, no event handlers are attached,
 * and `useState` never updates. The output is one render with the initial
 * state, which is exactly why anything reading `window` blows up here.
 */
export function renderPage(options: {
  element: ReactElement;
  title: string;
  data: unknown;
}): string {
  const body = renderToString(options.element);

  return documentHtml({ title: options.title, body, data: options.data });
}

/** Just the markup, for tests and for embedding in a larger document. */
export function renderBody(element: ReactElement): string {
  return renderToString(element);
}
