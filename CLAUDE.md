# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hall Meal Manager** — A full-stack web application for managing university hall dining, meal bookings, expenses, and payments. Built for Bangladesh university halls (timezone: Asia/Dhaka).

Tech stack: **Laravel 12 + React 19 + TypeScript + Inertia.js + Tailwind CSS 4**

---

## Common Commands

### Development

```bash
# Full setup (install deps, migrate, build assets)
composer setup

# Start all dev services concurrently (Laravel server + queue worker + Vite)
composer dev

# SSR dev mode (server + queue + log viewer + SSR server)
composer dev:ssr

# Stream application logs
php artisan pail

# Or individually:
php artisan serve
php artisan queue:listen
npm run dev
```

### Docker

```bash
docker compose up                                            # Local dev — compose.override.yml auto-applied
docker compose -f compose.yml -f compose.prod.yml up -d     # Production (Nginx + Cloudflare Tunnel)
docker exec <APP_NAME>_nginx nginx -s reload                 # Reload Nginx config without downtime
docker exec <APP_NAME>_app php artisan queue:retry all       # Retry all failed jobs
```

### Testing & Linting

```bash
composer test              # Run Pint linter + Pest tests
./vendor/bin/pest          # Run PHP tests only
./vendor/bin/pest tests/Feature/ExampleTest.php  # Single test file

# Tests use in-memory SQLite and sync queue automatically (phpunit.xml) — no DB setup needed

npm run types              # TypeScript type check
npm run lint               # ESLint (auto-fix)
npm run format             # Prettier (auto-fix)
npm run format:check       # Prettier (check only)
```

### Database

```bash
php artisan migrate        # Run pending migrations
php artisan migrate:fresh --seed  # Reset and reseed
```

---

## Architecture

### Request Lifecycle

```
HTTP Request → Middleware (Auth/Role Gate) → Controller → Inertia::render() → React Page Component
```

Inertia.js bridges Laravel and React: controllers return `Inertia::render('PageName', $props)`, and React components receive props directly — no separate API layer.

### Role System

Five roles defined in `App\Models\User`: `super_admin`, `hall_admin`, `student`, `teacher`, `staff`.

Access control uses Laravel Gates registered in `App\Providers\AppServiceProvider`:
- `access-admin` — super_admin or hall_admin
- `access-student`, `access-teacher`, `access-staff` — respective roles

Each role has isolated dashboards under `resources/js/pages/{admin,student,teacher,staff}/`.

### Controller Organization

Controllers in `app/Http/Controllers/` are organized by role:
- `Admin/` — Meal expense management, student/teacher/staff registration, daily/monthly costs, manual booking, bulk import, PDF export
- `Student/` — Meal booking, game scores
- `Teacher/` — Dashboard, meal booking
- `Staff/` — Dashboard, meal booking

### Data Model

Key models and relationships:
- `User` — central auth model with `role` and `hall_id`
- `Student`, `Teacher`, `Staff` — profile tables linked 1:1 to `User`
- `Hall` — dining halls with `seat_rent` and `prefix`
- `MealBooking` — bookings with `meal_type` (breakfast/lunch/dinner), `booking_date`, `is_taken`, `price`
- `DailyMealCost` / `MonthlyCost` / `MealExpenseItem` — financial tracking
- `Payment` — student balance top-ups

### Frontend Structure

```
resources/js/
├── app.tsx / ssr.tsx      # Entry points
├── pages/                 # One file per Inertia page (maps to controller renders)
│   ├── admin/
│   ├── student/
│   ├── teacher/
│   ├── staff/
│   ├── auth/
│   └── settings/
├── components/            # Reusable UI (AppShell, modals, forms, games)
├── layouts/               # Shared layout wrappers with sidebar/header
├── hooks/                 # React hooks
├── lib/                   # Utility functions
└── types/                 # Shared TypeScript types
```

Pages use `@/` path alias (maps to `resources/js/`).

### Queue & Async

Queue driver is `database` (local) or `redis` (production). The `CheckMealDues` artisan command runs scheduled checks. Start the worker with `php artisan queue:listen`.

### SSR

SSR is configured via Inertia + `resources/js/ssr.tsx`. Build with `npm run build:ssr` and start with `php artisan inertia:start-ssr`.

### Ramadan Support

Meal types have Ramadan aliases: Breakfast → Sehri, Lunch → Iftar. Logic exists in the meal booking flow to conditionally rename meal types.

---

## Environment

Copy `.env.example` to `.env` and run `php artisan key:generate`.

Key variables:
- `DB_CONNECTION` — `sqlite` (local) or `mysql` (Docker/production)
- `QUEUE_CONNECTION` — `database` (local) or `redis`
- `CACHE_STORE` — `database` (local) or `redis`
- `SESSION_DRIVER` — `database`
- `APP_TIMEZONE` — Asia/Dhaka

---

## CI/CD

GitHub Actions in `.github/workflows/`:
- **tests.yml** — Runs Pest tests on PHP 8.4 and 8.5 with Node 22
- **lint.yml** — Runs Pint, Prettier, and ESLint on push to `develop`/`main`

---

## Gotchas

### Wayfinder (Type-safe Routes)
Laravel Wayfinder auto-generates TypeScript route bindings via `@laravel/vite-plugin-wayfinder`. Import named route functions in frontend code instead of using string URLs. Bindings are regenerated on every `npm run dev` or `npm run build`.

### CarbonImmutable
`Date::use(CarbonImmutable::class)` is set globally in `AppServiceProvider`. All date instances are immutable — date manipulation must be reassigned:
```php
$date = $date->addDays(1); // correct — returns new instance
$date->addDays(1);         // wrong — original is unchanged
```

### React Compiler
`babel-plugin-react-compiler` is active in `vite.config.ts`. The compiler auto-memoizes components but enforces the Rules of React strictly — avoid mutating props or state directly.

### Password Policy by Environment
Development has no password requirements. Production enforces: minimum 12 characters, mixed case, numbers, symbols, and an uncompromised check (HaveIBeenPwned). Tests always use the dev (permissive) policy.

### User `unique_id` Auto-generation
`User::booted()` auto-assigns `unique_id` as `MID-XXXXX` for all non-admin users on creation. When writing factories or seeders for student/teacher/staff users, do not set `unique_id` manually unless overriding is intentional.

### Docker Infrastructure
`MYSQL_USER` must NOT be `root` — MySQL 8 refuses to create a duplicate root user and the container errors on a fresh volume. Use a separate app username (default: `laravel`).

`DB_ROOT_PASSWORD` (MySQL superuser) and `DB_PASSWORD` (app user) are separate `.env` vars — both required in production.

`npm run build` must run before `npm run types` — Wayfinder generates TypeScript route bindings during the Vite build. Running `tsc` before building produces missing-module errors.

Scheduler and queue containers are disabled in local dev (`profiles: donotstart` in `compose.override.yml`). Use `composer dev` locally instead. To test a scheduled command manually: `php artisan schedule:run`.
