/**
 * Feature flags
 * =============
 * Three different things wear the same name, and they have different
 * lifetimes:
 *
 *   a kill switch     turns a feature off in production without a deploy.
 *                     Lives forever. Defaults to ON
 *   a gradual rollout 1%, then 10%, then everyone. Lives for weeks, then the
 *                     flag and the old code path are deleted. Defaults to OFF
 *   an experiment     two variants and a measurement. Lives until the
 *                     experiment concludes
 *
 * **Bucketing must be deterministic.** `Math.random() < 0.1` gives a user a
 * different experience on every page load. `hash(flag + userId) % 100 < 10`
 * gives the same answer forever, on every device, with no round trip and no
 * stored state.
 *
 * The flag key goes into the hash for a reason. Hash the user id alone and
 * the same unlucky 10% gets every half-finished feature in the product,
 * which is how one small group of customers ends up with a permanently broken
 * experience and nobody can reproduce it.
 *
 * **Decide what happens when the service is down.** It will be: slow, down,
 * or blocked by an extension. A kill switch that defaults to off turns an
 * outage in your flag provider into an outage in your product. A new code
 * path that defaults to on ships untested code to everyone at the worst
 * moment. Both defaults are wrong somewhere, so choose per flag.
 *
 * **Flags are debt with an interest rate.** Two flags is four code paths,
 * three is eight, and the combinations are not tested. Put a removal date on
 * every rollout flag when you create it, and delete the losing branch as part
 * of finishing the work rather than as a separate task nobody schedules.
 *
 * **What not to use them for**: access control. A flag hidden in the client
 * is a UI decision, not a permission. Anyone can flip it in devtools, so the
 * server has to check anyway.
 */
import { useState } from "react";

import { bucket, isEnabled, type Flag } from "../lib/flags";

const FLAGS: Flag[] = [
  { key: "new-checkout", rollout: 10, fallback: false },
  { key: "payments-enabled", rollout: 100, fallback: true },
  { key: "beta-search", rollout: 50, fallback: false },
];

const USERS = ["user_1", "user_2", "user_3", "user_4", "user_5"];

export function FeatureFlags() {
  const [userId, setUserId] = useState("user_1");

  return (
    <div className="stack">
      <h3>The same user always gets the same answer</h3>
      <label className="row">
        User
        <select
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          aria-label="User"
        >
          {USERS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <table style={{ borderCollapse: "collapse" }} data-testid="flags">
        <thead>
          <tr>
            {["Flag", "Rollout", "Bucket", "Enabled", "If the service is down"].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "0.3rem 1rem 0.3rem 0" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FLAGS.map((flag) => (
            <tr key={flag.key} data-testid={`flag-${flag.key}`}>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0" }}>
                <code>{flag.key}</code>
              </td>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0" }}>{flag.rollout}%</td>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0" }}>{bucket(flag.key, userId)}</td>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0" }}>
                {isEnabled(flag, userId) ? "yes" : "no"}
              </td>
              <td style={{ padding: "0.25rem 1rem 0.25rem 0" }}>{flag.fallback ? "on" : "off"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="note">
        Switch users and back: the buckets are identical. They would not be with{" "}
        <code>Math.random()</code>, and neither would any measurement taken from them.
      </p>

      <h3>Different flags, different unlucky users</h3>
      <pre className="log" data-testid="independence">
        {USERS.map(
          (id) =>
            `${id}  ${FLAGS.map((flag) => `${flag.key}=${String(bucket(flag.key, id)).padStart(2, "0")}`).join("  ")}`,
        ).join("\n")}
      </pre>
      <p className="note">
        The flag key is part of the hash, so being in the unlucky bucket for one flag says nothing
        about the next. Hash the user alone and the same customers get every unfinished feature.
      </p>
    </div>
  );
}
