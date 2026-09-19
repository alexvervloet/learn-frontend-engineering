import type { NextConfig } from "next";

/**
 * Deliberately almost empty. Next 16 needs no configuration to do any of what
 * this module demonstrates: Server Components, streaming, server actions and
 * caching are all defaults or per-file exports, not config.
 */
const config: NextConfig = {
  // The repo hoists dependencies to the root with npm workspaces, so Next has
  // to be told where the project actually starts. Without it, it walks up to
  // the repo root looking for a lockfile and warns about inferring the wrong
  // workspace root.
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
};

export default config;
