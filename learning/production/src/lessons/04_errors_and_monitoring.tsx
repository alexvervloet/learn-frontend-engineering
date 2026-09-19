/**
 * Knowing when it broke
 * =====================
 * **An error boundary catches less than people think.** It catches errors
 * thrown *while rendering*, in a lifecycle method, or in a constructor,
 * anywhere below it in the tree. It does not catch:
 *
 *   an error in an event handler        that is just a normal throw
 *   a rejected promise with no catch    async, nothing is rendering
 *   an error in setTimeout              same
 *   an error in the boundary itself     it cannot catch its own
 *   anything on the server              different process, different handler
 *
 * So a boundary plus `window.addEventListener("error")` and
 * `"unhandledrejection"` is the minimum, and any error tracker installs all
 * three for you. Installing only the boundary and concluding your app has no
 * errors is a common and comfortable mistake.
 *
 * **Source maps: `sourcemap: "hidden"`.** `true` emits maps *and* the
 * `//# sourceMappingURL` comment, so anyone can fetch your original source.
 * `false` gives you stack traces in minified code, which are useless. Hidden
 * emits the maps without the comment: you upload them to the error tracker at
 * deploy time and do not serve them. `vite.config.ts` in this module does it.
 *
 * **Set the release, or the traces are noise.** A stack trace is only
 * resolvable against the source map for the build it came from, so the
 * release has to be the commit SHA and it has to match what you uploaded.
 *
 * **Scrub before sending.** A crash report includes the URL, form state,
 * breadcrumbs and whatever you attached. Any of those can contain an email, a
 * card number or a bearer token, and once sent it is on someone else's server
 * and in their backups. `scrubEvent` in `src/lib/reporting.ts` is the hook,
 * which Sentry calls `beforeSend`.
 *
 * Keep the user *id*. Without it you cannot distinguish one user hitting an
 * error a thousand times from a thousand users hitting it once, and those
 * call for completely different responses. Drop the email.
 *
 * **Sample, and never sample errors.** Performance traces at 10% are
 * statistically fine and cheap. Errors at 10% means nine out of ten crashes
 * are invisible, and the one you are chasing is usually in the nine.
 */
import { Component, useState, type ReactNode } from "react";

import { COVERAGE, scrubEvent, type Caught, type ReportedEvent } from "../lib/reporting";

class Boundary extends Component<
  { children: ReactNode; onCatch: (c: Caught) => void },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error) {
    this.props.onCatch({ source: "boundary", message: error.message });
  }

  override render() {
    if (this.state.failed) {
      return (
        <p role="alert" data-testid="boundary-caught">
          The boundary caught it.
        </p>
      );
    }
    return this.props.children;
  }
}

function Exploding({ when }: { when: boolean }) {
  if (when) throw new Error("thrown while rendering");
  return <p>Nothing wrong yet.</p>;
}

const SAMPLE_EVENT: ReportedEvent = {
  message: "Request failed for ada@example.com with Bearer abc.def.ghi",
  release: "a1b2c3d",
  user: { id: "user_123", email: "ada@example.com" },
  extra: {
    endpoint: "/api/orders",
    authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
    body: { cardNumber: "4111 1111 1111 1111", note: "reach me at ada@example.com" },
  },
  breadcrumbs: [{ message: "clicked Pay with card 4111111111111111" }],
};

export function ErrorsAndMonitoring() {
  const [failing, setFailing] = useState(false);
  const [caught, setCaught] = useState<Caught[]>([]);

  return (
    <div className="stack">
      <h3>What catches what</h3>
      <table style={{ borderCollapse: "collapse" }} data-testid="coverage">
        <tbody>
          {COVERAGE.map((row) => (
            <tr key={row.kind}>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>{row.kind}</td>
              <td style={{ padding: "0.2rem 1rem 0.2rem 0" }}>
                <code>{row.caughtBy}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>The boundary, in practice</h3>
      <div className="row">
        <button onClick={() => setFailing(true)}>Throw during render</button>
        <button onClick={() => setFailing(false)}>Reset</button>
      </div>
      <Boundary onCatch={(entry) => setCaught((current) => [...current, entry])}>
        <Exploding when={failing} />
      </Boundary>
      <pre className="log" data-testid="caught">
        {caught.length === 0
          ? "nothing caught yet"
          : caught.map((c) => `${c.source}: ${c.message}`).join("\n")}
      </pre>

      <h3>Scrubbing before it leaves the browser</h3>
      <div className="row" style={{ alignItems: "flex-start", gap: "2rem" }}>
        <div style={{ flex: 1, minWidth: "18rem" }}>
          <p>
            <strong>As captured</strong>
          </p>
          <pre className="log">{JSON.stringify(SAMPLE_EVENT, null, 2)}</pre>
        </div>
        <div style={{ flex: 1, minWidth: "18rem" }}>
          <p>
            <strong>As sent</strong>
          </p>
          <pre className="log" data-testid="scrubbed">
            {JSON.stringify(scrubEvent(SAMPLE_EVENT), null, 2)}
          </pre>
        </div>
      </div>

      <p className="note">
        The user id survives and the email does not. One user hitting an error a thousand times and
        a thousand users hitting it once need different responses, and only the id tells you which
        you have.
      </p>
    </div>
  );
}
