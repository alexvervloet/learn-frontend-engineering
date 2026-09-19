/**
 * Shipping it
 * ===========
 * A built frontend is a folder of static files. Everything interesting is in
 * how they are served and how they got there.
 *
 * **Two-stage Docker build.** Stage one has Node, the source and every
 * dependency; stage two has nginx and a directory. Nothing from stage one
 * reaches the final image: no `node_modules`, no source, no package manager,
 * no build-time token left in a layer. Roughly a gigabyte becomes roughly
 * fifty megabytes, and the attack surface shrinks with it.
 *
 * **A `.dockerignore` is not optional.** Docker sends the whole build context
 * to the daemon before the first instruction runs. Without one, that is this
 * monorepo including every `node_modules`: 817MB, and several minutes before
 * anything starts. The Dockerfile installs from the lockfile anyway, so
 * sending them is worse than pointless, and a host's `node_modules` can hold
 * binaries compiled for the wrong platform. This was not a hypothetical: the
 * first build of this image was killed after ten minutes of uploading
 * context.
 *
 * **Copy the manifests before the source.** Docker caches layers, so
 * `COPY package*.json` then `npm ci` then `COPY . .` means editing a
 * component does not reinstall dependencies. Copying everything first is the
 * single most common reason a frontend build takes four minutes instead of
 * twenty seconds.
 *
 * **The four nginx rules that are not optional:**
 *
 *   try_files $uri /index.html    the SPA fallback. Without it a refresh on
 *                                 /products/keyboard is a 404 while
 *                                 navigating there works, which produces a
 *                                 baffling bug report
 *   /assets/ immutable, 1 year    the filenames are content-hashed, so there
 *                                 is no invalidation problem to have
 *   index.html no-cache           it points at the hashed assets. Cache it
 *                                 and users get last week's app asking for
 *                                 files that no longer exist
 *   security headers              CSP from lesson 02, plus nosniff, a
 *                                 referrer policy and a permissions policy
 *
 * That third one is the one people get wrong, and the symptom is horrible: a
 * deploy goes out, a proportion of users get a white screen, and it clears up
 * on its own over hours as caches expire.
 *
 * **Run as a non-root user, using the image built for it.** The official
 * `nginx` image runs as root. The first version of this Dockerfile created a
 * user and chowned `/var/cache/nginx`, `/var/run` and `/var/log/nginx` to it;
 * the image built and the container exited on startup, because the entrypoint
 * and the default config expect root in more places than that.
 * `nginxinc/nginx-unprivileged` is the same nginx, running as uid 101 and
 * listening on 8080, with no chown needed. Reach for the purpose-built image
 * rather than chowning your way there.
 *
 * **Block `.map` at the server.** Lesson 04 sets `sourcemap: "hidden"` so the
 * comment is not emitted; this stops the files being reachable even if one is
 * copied in by accident. Belt and braces, and the braces cost one location
 * block.
 *
 * The real `Dockerfile` and `nginx.conf` are in this module's root, and the
 * test beside this file asserts each of the properties above against them, so
 * the prose cannot drift from the files.
 */
const DECISIONS = [
  {
    decision: "Two build stages",
    why: "The final image has no source, no node_modules and no package manager",
  },
  {
    decision: ".dockerignore",
    why: "Without one the build context is 817MB of node_modules, sent before anything runs",
  },
  {
    decision: "Manifests copied before source",
    why: "Editing a component does not reinstall dependencies",
  },
  {
    decision: "try_files … /index.html",
    why: "A refresh on a deep link is a 404 without it",
  },
  {
    decision: "/assets/ immutable for a year",
    why: "Filenames are content-hashed, so there is nothing to invalidate",
  },
  {
    decision: "index.html never cached",
    why: "It points at the hashed assets. Cache it and you ship a white screen",
  },
  {
    decision: "nginx-unprivileged",
    why: "A file server has no reason to be root, and chowning the official image does not work",
  },
  { decision: ".map returns 404", why: "Source maps go to the error tracker, not to visitors" },
];

export function Shipping() {
  return (
    <div className="stack">
      <h3>The decisions in Dockerfile and nginx.conf</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }} data-testid="decisions">
        <thead>
          <tr>
            {["Decision", "Why"].map((heading) => (
              <th
                key={heading}
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  padding: "0.4rem 0.8rem 0.4rem 0",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DECISIONS.map((row) => (
            <tr key={row.decision}>
              <td style={{ padding: "0.3rem 0.8rem 0.3rem 0", verticalAlign: "top" }}>
                <code>{row.decision}</code>
              </td>
              <td style={{ padding: "0.3rem 0.8rem 0.3rem 0", verticalAlign: "top" }}>{row.why}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Building it</h3>
      <pre className="log">{`docker build \\
  --build-arg VITE_API_URL=https://api.example.com \\
  --build-arg VITE_COMMIT_SHA=$(git rev-parse --short HEAD) \\
  -f learning/production/Dockerfile \\
  -t frontend:$(git rev-parse --short HEAD) .

docker run --rm -p 8080:8080 frontend:$(git rev-parse --short HEAD)`}</pre>

      <p className="note">
        The build args are why the same image cannot go from staging to production. That is lesson
        01, showing up as a deployment constraint rather than as a code smell.
      </p>
    </div>
  );
}
