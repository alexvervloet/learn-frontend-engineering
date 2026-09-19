/**
 * Streaming
 * =========
 * `renderToString` has one shape: it walks the whole tree and returns a
 * string. Nothing can be sent until the slowest part is done, so one query
 * that takes 800ms holds up the entire page, including the header that was
 * ready instantly.
 *
 * `renderToReadableStream` sends the page in pieces:
 *
 *   1. the shell, meaning everything outside a `<Suspense>` boundary, plus
 *      each boundary's fallback
 *   2. later, each resolved boundary's real content, with a small inline
 *      script that swaps it in
 *
 * The browser starts parsing and painting after the first chunk. LCP stops
 * being bounded by your slowest query.
 *
 * **Suspense boundaries are where you decide what can be late.** A boundary
 * around the reviews on a product page means the price and the buy button are
 * in the first flush and the reviews arrive when they arrive. No boundary and
 * everything waits for the reviews. That placement is a performance decision,
 * not a loading-state decision, and it is the main thing to think about.
 *
 * **Two promises, and confusing them undoes the whole thing:**
 *
 *   await renderToReadableStream(…)   the *shell* is ready. Respond now
 *   await stream.allReady             everything is ready
 *
 * Awaiting `allReady` before responding is `renderToString` with more moving
 * parts. It is the right call for a crawler that will not run scripts, or for
 * a static prerender, and for nobody else.
 *
 * **Errors after the shell cannot become a 500.** The status line went out
 * with the first chunk. React renders the boundary's fallback and retries on
 * the client, and `onError` is the only place the failure is visible to you.
 * A streaming server with no `onError` is a server with no error log.
 *
 * All of this is exercised in `src/render/stream.test.tsx`, which runs in the
 * node environment and asserts the chunk boundaries: that the first chunk has
 * the shell and the fallback and not the slow content, and that the slow
 * content turns up later in the same response.
 */
const FLOW = [
  { at: "0ms", csr: "empty div", ssr: "nothing yet", streaming: "nothing yet" },
  { at: "100ms", csr: "empty div", ssr: "nothing yet", streaming: "header, price, fallback" },
  { at: "400ms", csr: "spinner", ssr: "nothing yet", streaming: "header, price, fallback" },
  { at: "900ms", csr: "spinner", ssr: "whole page", streaming: "everything" },
  { at: "1400ms", csr: "whole page", ssr: "whole page", streaming: "everything" },
];

export function Streaming() {
  return (
    <div className="stack">
      <h3>What the user sees, on a page with one slow query</h3>
      <table style={{ borderCollapse: "collapse" }} data-testid="flow">
        <thead>
          <tr>
            {["Time", "Client-rendered", "renderToString", "Streaming"].map((heading) => (
              <th key={heading} style={{ textAlign: "left", padding: "0.3rem 1rem 0.3rem 0" }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FLOW.map((row) => (
            <tr key={row.at}>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>
                <code>{row.at}</code>
              </td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>{row.csr}</td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>{row.ssr}</td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>{row.streaming}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>The shape of it</h3>
      <pre className="log">{`const stream = await renderToReadableStream(<App />, {
  onError: (error) => log(error),   // the only place a late error is visible
});

// Respond now. Do NOT await stream.allReady unless the caller
// cannot run scripts.
return new Response(stream, {
  headers: { "content-type": "text/html" },
});`}</pre>

      <p className="note">
        The assertions for all of this are in <code>src/render/stream.test.tsx</code>, which runs in
        Node and checks that the first chunk contains the shell and the fallback and not the slow
        content.
      </p>
    </div>
  );
}
