# =============================================================================
# Hall Meal Manager — Dockerfile
# =============================================================================
#
# Multi-stage build producing a minimal PHP-FPM runtime image.
# Nginx runs as a separate container and proxies to this image on port 9000.
#
# Stages:
#   composer_builder  Install PHP dependencies (no dev, optimized autoloader)
#   node_builder      Install JS deps + compile Vite assets, then prune
#   runtime           Final PHP-FPM image — copies only runtime artifacts
#
# Build:
#   docker build -t <APP_NAME>_app:latest .
#
# Run via Compose (recommended):
#   docker compose up          # local dev (compose.override.yml applied)
#   docker compose -f compose.yml -f compose.prod.yml up   # production
#
# The image is shared by the app, scheduler, and queue services.
# Each service overrides the ENTRYPOINT/CMD as needed.
# =============================================================================

# ── Stage 1: Composer dependencies ───────────────────────────────────────────
# Uses a lightweight CLI image — FPM not needed here.
# Only composer.json + composer.lock are copied first to leverage Docker's
# layer cache: vendor/ is only rebuilt when dependencies actually change.
FROM php:8.4-cli-alpine AS composer_builder
WORKDIR /app

RUN apk add --no-cache libzip-dev zip unzip git \
    && docker-php-ext-install zip

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
# --no-dev: exclude testing/dev tools from production image
# --optimize-autoloader: generates a classmap for faster class resolution
RUN composer install --no-dev --no-scripts --prefer-dist --optimize-autoloader

# ── Stage 2: Node / Vite asset builder ───────────────────────────────────────
# Builds CSS and JS bundles (Tailwind CSS 4 + React 19 via Vite).
# Output lands in public/build/ with content-hashed filenames (safe to cache forever).
# npm prune --production drops devDependencies before the final COPY.
FROM php:8.4-cli-alpine AS node_builder
WORKDIR /app

RUN apk add --no-cache nodejs npm

COPY package.json package-lock.json ./
# npm ci: installs from lockfile exactly — deterministic, no network surprises
RUN npm ci

COPY . .
COPY --from=composer_builder /app/vendor ./vendor

RUN npm run build && npm prune --production

# ── Stage 3: Runtime (PHP-FPM) ───────────────────────────────────────────────
# Minimal image: only runtime PHP extensions + app code.
# No composer, no Node, no build tools — reduces attack surface and image size.
#
# PHP extensions installed:
#   pdo_mysql     MySQL (production via Docker)
#   pdo_sqlite    SQLite (local/test via phpunit.xml)
#   pdo_pgsql     PostgreSQL (optional, kept for flexibility)
#   bcmath        Laravel encryption / hashing
#   gd            DomPDF image support (PDF export feature)
#   redis (pecl)  Redis session/cache/queue driver
#   zip           File handling
FROM php:8.4-fpm-alpine

LABEL maintainer="team@example.com" \
      version="1.0.0" \
      description="Laravel App Server"

WORKDIR /app

RUN apk add --no-cache \
    curl \
    sqlite-dev \
    postgresql-dev \
    libpng-dev \
    libzip-dev \
    zip \
    unzip \
    tini \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql pdo_pgsql zip bcmath gd \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# Non-root user — reduces container privilege to minimum required.
# storage/, bootstrap/cache/, public/ are chowned below so FPM can write.
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Selective copy — only runtime artifacts from node_builder.
# Excluded: node_modules, .env*, tests/, .git/, .github/ (see .dockerignore).
# public/ is also mounted as a named volume (app_public) so Nginx can serve
# static files directly without touching PHP-FPM.
COPY --from=node_builder /app/app ./app
COPY --from=node_builder /app/bootstrap ./bootstrap
COPY --from=node_builder /app/config ./config
COPY --from=node_builder /app/database ./database
COPY --from=node_builder /app/public ./public
COPY --from=node_builder /app/resources ./resources
COPY --from=node_builder /app/routes ./routes
COPY --from=node_builder /app/storage ./storage
COPY --from=node_builder /app/vendor ./vendor
COPY --from=node_builder /app/artisan ./artisan

# storage/      Laravel writes logs, cache, sessions, uploaded files here.
# bootstrap/cache/ Framework caches (routes, config, events) go here.
# public/       Nginx reads from the app_public volume; FPM needs write for
#               symlinks (storage:link) but not normal request handling.
RUN mkdir -p bootstrap/cache \
    && chown -R appuser:appgroup storage bootstrap/cache public \
    && chmod -R 775 storage bootstrap/cache public

USER appuser

# PHP-FPM listens on TCP 9000 (internal only).
# Nginx proxies to this port — it is never exposed to the host directly.
EXPOSE 9000

# Healthcheck: confirms PHP-FPM process is accepting TCP connections.
# This is intentionally lightweight — full dependency health (DB + Redis)
# is checked by Nginx via the /health route in routes/web.php.
# start_period=15s: gives Laravel time to boot before the first check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD nc -z 127.0.0.1 9000 || exit 1

# tini: PID 1 init process — forwards signals correctly and reaps zombies.
# Without tini, php-fpm as PID 1 may not handle SIGTERM cleanly on shutdown.
ENTRYPOINT ["/sbin/tini", "--", "php-fpm"]
