# ── Stage 1: Composer dependencies ───────────────────────────────────────────
FROM php:8.4-cli-alpine AS composer_builder
WORKDIR /app

# Install system dependencies for composer
RUN apk add --no-cache libzip-dev zip unzip git \
    && docker-php-ext-install zip

# Install composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Copy manifests
COPY composer.json composer.lock ./
# Install no-dev dependencies
RUN composer install --no-dev --no-scripts --prefer-dist --optimize-autoloader

FROM php:8.4-cli-alpine AS node_builder
WORKDIR /app

# Install Node.js
RUN apk add --no-cache nodejs npm
# Copy package manifests
COPY package.json package-lock.json ./
# Install dependencies
RUN npm ci

# Copy full source and built vendor from composer stage
COPY . .
COPY --from=composer_builder /app/vendor ./vendor

# Build Vite assets
RUN npm run build && npm prune --production

# ── Stage 3: Runtime (alpine) ────────────────────────────────────────────────
FROM php:8.4-cli-alpine

LABEL maintainer="team@example.com" \
      version="1.0.0" \
      description="Laravel App Server"

WORKDIR /app

# Install minimal required PHP extensions for SQLite/MySQL/Redis, plus tini for init
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

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Selective copy — only runtime artifacts
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

# Set correct permissions
RUN mkdir -p bootstrap/cache \
    && chown -R appuser:appgroup storage bootstrap/cache public \
    && chmod -R 775 storage bootstrap/cache public

USER appuser

EXPOSE 80

# Healthcheck using curl on the exposed port
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost/up || exit 1

ENTRYPOINT ["/sbin/tini", "--", "php", "artisan", "serve", "--host=0.0.0.0", "--port=80"]
