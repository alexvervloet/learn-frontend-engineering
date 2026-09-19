import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Shipping } from "./07_shipping";

const root = join(import.meta.dirname, "..", "..");
const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");
const nginxConf = readFileSync(join(root, "nginx.conf"), "utf8");
const securityHeaders = readFileSync(join(root, "nginx-security-headers.conf"), "utf8");
// At the repo root, because that is where the build context starts.
const dockerignore = readFileSync(join(root, "..", "..", ".dockerignore"), "utf8");

/**
 * Asserted against the real files, not against a copy in the lesson. The
 * prose describes seven decisions; if someone edits the Dockerfile and not
 * the lesson, these fail.
 */
describe("the Dockerfile", () => {
  it("is not empty, so the rest of this file is not vacuous", () => {
    expect(dockerfile.length).toBeGreaterThan(200);
    expect(nginxConf.length).toBeGreaterThan(200);
  });

  it("has two stages and serves from the second", () => {
    const stages = [...dockerfile.matchAll(/^FROM .+ AS (\w+)/gm)].map((match) => match[1]);

    expect(stages).toEqual(["build", "serve"]);
    // Nothing from the build stage except the built files.
    expect(dockerfile).toMatch(/COPY --from=build .*\/dist/);
  });

  it("copies the manifests before the source", () => {
    const manifestCopy = dockerfile.indexOf("COPY package.json");
    const install = dockerfile.indexOf("RUN npm ci");
    const sourceCopy = dockerfile.indexOf("COPY . .");

    // The layer-caching order. Reverse it and every build reinstalls.
    expect(manifestCopy).toBeGreaterThan(-1);
    expect(manifestCopy).toBeLessThan(install);
    expect(install).toBeLessThan(sourceCopy);
  });

  it("runs as a non-root user, via the image built for it", () => {
    // Not `nginx:alpine` plus a pile of chowns: that builds and then exits on
    // startup, because the entrypoint expects root in more places.
    expect(dockerfile).toContain("nginxinc/nginx-unprivileged");
    expect(dockerfile).toMatch(/^USER 101$/m);
    expect(dockerfile).not.toMatch(/^FROM nginx:/m);
  });

  it("has a health check", () => {
    expect(dockerfile).toContain("HEALTHCHECK");
  });
});

describe("the build context", () => {
  it("excludes node_modules, which is most of 817MB", () => {
    // Docker uploads the entire context before running the first
    // instruction. The first build of this image was killed after ten
    // minutes of doing exactly that.
    expect(dockerignore).toMatch(/^\*\*\/node_modules$/m);
  });

  it("excludes build output the image rebuilds anyway", () => {
    for (const pattern of ["**/dist", "**/.next", "**/.astro"]) {
      expect(dockerignore).toContain(pattern);
    }
  });

  it("excludes .git and every .env", () => {
    expect(dockerignore).toMatch(/^\.git$/m);
    expect(dockerignore).toMatch(/^\*\*\/\.env$/m);
  });
});

describe("the nginx config", () => {
  it("falls back to index.html, so a refresh on a deep link works", () => {
    expect(nginxConf).toMatch(/try_files \$uri \$uri\/ \/index\.html;/);
  });

  it("caches hashed assets forever", () => {
    expect(nginxConf).toMatch(/location \/assets\/[\s\S]*?immutable/);
  });

  it("never caches index.html, which is the one that ships a white screen", () => {
    // The hashed assets are immutable; the file pointing at them must not be.
    expect(nginxConf).toMatch(/location = \/index\.html[\s\S]*?no-cache/);
  });

  it("sets a CSP with no unsafe-inline on scripts", () => {
    const csp = /add_header Content-Security-Policy "([^"]+)"/.exec(securityHeaders)?.[1] ?? "";

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("sets the one-line headers that have no downside", () => {
    expect(securityHeaders).toContain("X-Content-Type-Options");
    expect(securityHeaders).toContain("Referrer-Policy");
    expect(securityHeaders).toContain("Permissions-Policy");
  });

  it("includes the headers in every location that sets one of its own", () => {
    // `add_header` does not merge across levels: a location with any
    // add_header of its own discards the parent's. CI caught this as a
    // missing CSP on index.html, served with a 200.
    const blocks = [...nginxConf.matchAll(/location[^{]*\{([^}]*)\}/g)].map((m) => m[1] ?? "");
    const withOwnHeader = blocks.filter((body) => body.includes("add_header"));

    expect(withOwnHeader.length).toBeGreaterThan(0);
    for (const body of withOwnHeader) {
      expect(body).toContain("include /etc/nginx/conf.d/security-headers.conf;");
    }
  });

  it("refuses to serve source maps", () => {
    expect(nginxConf).toMatch(/location ~ \\\.map\$[\s\S]*?return 404/);
  });

  it("does not advertise its version", () => {
    expect(nginxConf).toContain("server_tokens off");
  });
});

describe("the lesson", () => {
  it("lists a reason for every decision", () => {
    render(<Shipping />);

    const rows = within(screen.getByTestId("decisions")).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(9);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      expect(cells[1]?.textContent?.trim().length ?? 0).toBeGreaterThan(20);
    }
  });
});
