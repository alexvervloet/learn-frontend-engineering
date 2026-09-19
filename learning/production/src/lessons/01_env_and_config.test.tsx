import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { findLeakedSecrets, readConfig } from "../lib/config";
import { EnvAndConfig } from "./01_env_and_config";

describe("parsing at startup", () => {
  it("accepts a complete environment", () => {
    const result = readConfig({ VITE_API_URL: "https://api.example.com", PROD: true });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.config.apiUrl).toBe("https://api.example.com");
    expect(result.config.environment).toBe("production");
  });

  it("names the missing variable rather than failing later", () => {
    const result = readConfig({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    // Not `fetch(undefined)` in a component three screens in.
    expect(result.problems).toContain("VITE_API_URL is required");
  });

  it("rejects a relative URL, which works locally and not from another origin", () => {
    const result = readConfig({ VITE_API_URL: "/api" });

    expect(result.ok).toBe(false);
  });

  it("treats the error tracker as optional and the API as not", () => {
    const result = readConfig({ VITE_API_URL: "https://api.example.com" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    // An app should run without a Sentry DSN. It should not run without
    // knowing where its API is.
    expect(result.config.sentryDsn).toBeNull();
  });

  it("falls back to a placeholder commit rather than undefined", () => {
    const result = readConfig({ VITE_API_URL: "https://api.example.com" });

    if (!result.ok) throw new Error("unreachable");
    expect(result.config.commitSha).toBe("unknown");
  });
});

describe("the secret check", () => {
  it("catches a secret that was given a public prefix", () => {
    expect(findLeakedSecrets({ VITE_STRIPE_SECRET_KEY: "sk_live_x" })).toEqual([
      "VITE_STRIPE_SECRET_KEY",
    ]);
    expect(findLeakedSecrets({ VITE_AUTH_TOKEN: "x" })).toEqual(["VITE_AUTH_TOKEN"]);
  });

  it("leaves the unprefixed ones alone, because they never reach the bundle", () => {
    expect(findLeakedSecrets({ DEPLOY_TOKEN: "x", DATABASE_PASSWORD: "y" })).toEqual([]);
  });

  it("does not object to the things that are meant to be public", () => {
    expect(
      findLeakedSecrets({
        VITE_API_URL: "https://api.example.com",
        VITE_SENTRY_DSN: "https://key@example.com/0",
        VITE_COMMIT_SHA: "a1b2c3d",
      }),
    ).toEqual([]);
  });
});

describe("the committed example file", () => {
  const example = readFileSync(join(import.meta.dirname, "..", "..", ".env.example"), "utf8");

  it("contains no name that would leak", () => {
    const env = Object.fromEntries(
      example
        .split("\n")
        .filter((line) => line.includes("=") && !line.trimStart().startsWith("#"))
        .map((line) => {
          const [key = "", ...rest] = line.split("=");
          return [key.trim(), rest.join("=")];
        }),
    );

    expect(findLeakedSecrets(env)).toEqual([]);
  });

  it("says plainly that VITE_ is public", () => {
    expect(example).toMatch(/INLINED INTO THE BUNDLE/);
  });
});

describe("the lesson", () => {
  it("flags the published secret in its own sample", () => {
    render(<EnvAndConfig />);

    expect(screen.getByRole("alert")).toHaveTextContent("VITE_STRIPE_SECRET_KEY");
  });
});
