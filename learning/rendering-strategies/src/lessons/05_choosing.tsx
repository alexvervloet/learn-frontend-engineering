/**
 * Choosing
 * ========
 * There is no ranking. Each of these trades something specific.
 *
 * The three questions that decide it:
 *
 *   **Is the content the same for everyone?** If yes, it can be static. If it
 *   depends on who is asking, it cannot be built in advance, and you are
 *   choosing between server rendering per request and rendering on the client.
 *
 *   **Does an anonymous first visit matter?** A marketing page, a product
 *   page, anything a search engine or a link preview will fetch: the first
 *   paint is the product. An internal tool behind a login: it is not.
 *
 *   **How stale can it be?** Seconds, minutes or hours of staleness is what
 *   buys you a CDN response instead of a render.
 *
 * Most real applications use more than one. A marketing site statically
 * generated, product pages on ISR, a logged-in dashboard client-rendered, a
 * checkout server-rendered per request. Frameworks make this a per-route
 * decision because it is a per-route decision.
 *
 * **What is not on the table any more:** client-rendering a public,
 * content-heavy page and hoping. Search engines do execute JavaScript, and it
 * is still slower, still fragile, and still gives link previews an empty page.
 *
 * The next two modules are the frameworks that implement all of this:
 * `next-app-router` and `astro-islands`.
 */
type Row = {
  strategy: string;
  whenRendered: string;
  goodFor: string;
  cost: string;
};

const ROWS: Row[] = [
  {
    strategy: "CSR",
    whenRendered: "In the browser, after the bundle runs",
    goodFor: "Dashboards, editors, anything behind a login",
    cost: "Empty first paint; content waits on JavaScript",
  },
  {
    strategy: "SSR",
    whenRendered: "On the server, per request",
    goodFor: "Personalised pages that must paint fast",
    cost: "A server per request; TTFB is your slowest query",
  },
  {
    strategy: "Streaming SSR",
    whenRendered: "On the server, in pieces",
    goodFor: "Pages where one section is much slower than the rest",
    cost: "Suspense boundaries to place; errors after the shell cannot 500",
  },
  {
    strategy: "SSG",
    whenRendered: "At build time",
    goodFor: "Docs, marketing, blogs. Anything identical for everyone",
    cost: "Build time grows with pages; stale until the next build",
  },
  {
    strategy: "ISR",
    whenRendered: "At build, then rebuilt in the background",
    goodFor: "Large catalogues that change occasionally",
    cost: "One visitor after expiry sees stale content, on purpose",
  },
];

export function Choosing() {
  return (
    <div className="stack">
      <table style={{ borderCollapse: "collapse", width: "100%" }} data-testid="strategies">
        <thead>
          <tr>
            {["Strategy", "Rendered", "Good for", "Cost"].map((heading) => (
              <th
                key={heading}
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  padding: "0.4rem 0.6rem 0.4rem 0",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.strategy}>
              <td style={{ padding: "0.35rem 0.6rem 0.35rem 0", verticalAlign: "top" }}>
                <strong>{row.strategy}</strong>
              </td>
              <td style={{ padding: "0.35rem 0.6rem 0.35rem 0", verticalAlign: "top" }}>
                {row.whenRendered}
              </td>
              <td style={{ padding: "0.35rem 0.6rem 0.35rem 0", verticalAlign: "top" }}>
                {row.goodFor}
              </td>
              <td style={{ padding: "0.35rem 0.6rem 0.35rem 0", verticalAlign: "top" }}>
                {row.cost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>The three questions</h3>
      <ol>
        <li>Is the content the same for everyone?</li>
        <li>Does an anonymous first visit matter?</li>
        <li>How stale is it allowed to be?</li>
      </ol>

      <p className="note">
        Most applications answer differently per route, which is why frameworks make this a
        per-route decision.
      </p>
    </div>
  );
}
