import { renderToReadableStream } from "react-dom/server";
import type { ReactElement } from "react";

/**
 * Streaming: send the shell now, the slow parts when they are ready.
 *
 * `renderToReadableStream` returns as soon as the shell is renderable. Anything
 * inside a `<Suspense>` that has not resolved is sent as its fallback, and
 * React appends the real content plus a small inline script later in the same
 * response. The browser starts painting after the first chunk rather than
 * after the last.
 *
 * Two promises, and the difference matters:
 *
 *   await renderToReadableStream(…)   resolves when the *shell* is ready
 *   stream.allReady                   resolves when everything has resolved
 *
 * A server that awaits `allReady` before responding has turned streaming back
 * into `renderToString` with extra steps. Await it only when you need the
 * complete document, such as a crawler that will not execute scripts, or a
 * static prerender.
 *
 * `onError` is not optional. An error thrown after the shell has been sent
 * cannot become a 500: the status line is already gone. React recovers on the
 * client, and your logging is the only way you will ever know it happened.
 */
export type StreamResult = {
  /** Every chunk, in order, as the browser would receive them. */
  chunks: string[];
  /** The complete document body. */
  html: string;
  /** Errors React reported while streaming. */
  errors: unknown[];
};

export async function renderStream(
  element: ReactElement,
  options: { waitForAll?: boolean } = {},
): Promise<StreamResult> {
  const errors: unknown[] = [];

  const stream = await renderToReadableStream(element, {
    onError: (error) => {
      // After the shell is flushed there is no status code left to change.
      errors.push(error);
    },
  });

  if (options.waitForAll === true) await stream.allReady;

  const chunks: string[] = [];
  const decoder = new TextDecoder();

  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(decoder.decode(chunk, { stream: true }));
  }

  return { chunks, html: chunks.join(""), errors };
}
