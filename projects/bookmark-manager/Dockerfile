# The production image, in two stages. Same shape as learning/production, and
# the comments there explain each decision in full.

# ---- build ----
FROM node:24-alpine AS build

WORKDIR /repo

# Manifests first, then install, then the source. Docker caches each layer,
# so editing a component does not reinstall node_modules.
COPY package.json package-lock.json ./
COPY projects/bookmark-manager/package.json projects/bookmark-manager/
RUN npm ci --workspace projects/bookmark-manager --include-workspace-root

COPY . .

# Baked into the bundle at build time, which is why the same image cannot be
# promoted from staging to production.
ARG VITE_API_URL=/api
ARG VITE_COMMIT_SHA=unknown
# "false" talks to the real Express API through whatever proxies /api.
# Anything else leaves the mock Service Worker in place, so the image runs
# with no backend, which is what CI does.
ARG VITE_USE_MOCK=true
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_COMMIT_SHA=$VITE_COMMIT_SHA
ENV VITE_USE_MOCK=$VITE_USE_MOCK

RUN npm run build --workspace projects/bookmark-manager

# ---- serve ----
# The unprivileged image, not `nginx:alpine`. Creating a user and chowning
# the official one builds fine and exits on startup; see the LESSONS entry.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS serve

COPY --from=build /repo/projects/bookmark-manager/dist /usr/share/nginx/html
COPY projects/bookmark-manager/nginx.conf /etc/nginx/conf.d/default.conf
COPY learning/production/nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
