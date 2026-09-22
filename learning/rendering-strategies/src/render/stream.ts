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
 *
 * **And the other half, which is the half you can still do something about.**
 * An error thrown *before* the shell is ready rejects the promise
 * `renderToReadableStream` returned. Nothing has been written, no status line
 * has been sent, and the server's options are all still open. That is the
 * moment to answer 500, or to send a static error page, or to fall back to an
 * empty HTML shell and let the client render it.
 *
 *   let stream;
 *   try {
 *     stream = await renderToReadableStream(<App />, { onError });
 *   } catch (error) {
 *     return new Response(errorPage, { status: 500 });   // still possible here
 *   }
 *   return new Response(stream, { status: 200 });        // committed now
 *
 * So one `<Suspense>` boundary changes what a failure costs you. Inside a
 * boundary, a throw is a fallback on screen and a line in your logs. Outside
 * every boundary, it is a 500 you can serve properly. That is a reason to put
 * a boundary around the risky part beyond the loading state.
 *
 * `renderStream` below returns a discriminated result rather than throwing,
 * because the status code is the lesson.
 *
 * **On Node, this API has a sibling.** `renderToReadableStream` returns a Web
 * `ReadableStream` and is what edge runtimes and this file use.
 * `renderToPipeableStream` returns something you `.pipe()` into a Node
 * response, and it is what an Express server wants. The shapes differ: the
 * pipeable one has no promise to await, and hands you `onShellReady`,
 * `onShellError` and `onError` callbacks instead. The split between "before
 * the shell" and "after the shell" is identical; `onShellError` is the 500
 * branch above, spelled as a callback.
 */
export type StreamResult = {
  /** 200 once the shell is out, 500 if it never was. */
  status: 200 | 500;
  /** Every chunk, in order, as the browser would receive them. */
  chunks: string[];
  /** The complete document body. */
  html: string;
  /** Errors React reported while streaming. */
  errors: unknown[];
  /** Set only when the shell itself failed, which is the recoverable case. */
  shellError?: unknown;
};

export async function renderStream(
  element: ReactElement,
  options: { waitForAll?: boolean } = {},
): Promise<StreamResult> {
  const errors: unknown[] = [];
  const decoder = new TextDecoder();

  let stream: Awaited<ReturnType<typeof renderToReadableStream>>;

  try {
    stream = await renderToReadableStream(element, {
      onError: (error) => {
        // Called for every error, before and after the shell. Which kind it
        // was is decided by whether the await below returns or throws.
        errors.push(error);
      },
    });
  } catch (shellError) {
    // Nothing has been written and no status line has been sent, so this one
    // can still be a 500. A real server returns an error page here.
    return { status: 500, chunks: [], html: "", errors, shellError };
  }

  if (options.waitForAll === true) await stream.allReady;

  const chunks: string[] = [];

  for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(decoder.decode(chunk, { stream: true }));
  }

  // Committed. Anything in `errors` from here on was recovered on the client
  // and is yours to notice in the logs.
  return { status: 200, chunks, html: chunks.join(""), errors };
}
