# A production image for a static frontend, in two stages.
#
# Stage one has Node, the source and every dependency. Stage two has nginx and
# a directory of files. Nothing from stage one is in the final image: no
# node_modules, no source, no package manager, no shell history containing a
# token. That is the whole point of a multi-stage build, and it takes the
# image from roughly a gigabyte to roughly fifty megabytes.

# ---- build ----
FROM node:24-alpine AS build

WORKDIR /repo

# Copy the manifests first, install, and only then copy the source. Docker
# caches each layer, so editing a component does not reinstall node_modules.
# Copying everything first is the single most common reason a frontend build
# takes four minutes instead of twenty seconds.
COPY package.json package-lock.json ./
COPY packages/lesson-shell/package.json packages/lesson-shell/
COPY learning/production/package.json learning/production/
RUN npm ci --workspace learning/production --include-workspace-root

COPY . .

# Build-time configuration is baked in here, which is exactly why the same
# image cannot be promoted from staging to production. See lesson 01.
ARG VITE_API_URL
ARG VITE_COMMIT_SHA=unknown
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_COMMIT_SHA=$VITE_COMMIT_SHA

RUN npm run build --workspace learning/production

# ---- serve ----
#
# The unprivileged image, not `nginx:alpine`.
#
# A container that serves static files has no reason to run as root, and the
# official nginx image does. The first version of this file created a user and
# chowned /var/cache/nginx, /var/run and /var/log/nginx to it. The image built
# and the container exited immediately: the entrypoint scripts and the
# default config expect root in more places than that, and chasing them one
# at a time is a losing game.
#
# nginxinc/nginx-unprivileged is the same nginx built for this. It runs as uid
# 101, listens on 8080 rather than 80, and needs no chown at all.
FROM nginxinc/nginx-unprivileged:1.29-alpine AS serve

COPY --from=build /repo/learning/production/dist /usr/share/nginx/html
COPY learning/production/nginx.conf /etc/nginx/conf.d/default.conf
COPY learning/production/nginx-security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Already the default in this image; stated so it is visible in the file.
USER 101

EXPOSE 8080

# A health check the orchestrator can use, rather than assuming a running
# process means a working server.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
