# MecaTrack API

NestJS REST API for MecaTrack workshop management (US-001: authentication, US-002: user management, US-003: client registration, US-004: vehicle registration, US-005: work order creation, US-006: work order task management, US-007: technical notes, US-008: delivery panel, US-009: vehicle and client history).

## Development vs production (same machine)

This repository is **development**. Production lives at `C:\Despliegues\AI4Devs-finalproject` and keeps the original ports.

| Service | Development (this repo) | Production |
|---------|-------------------------|------------|
| Web | `http://localhost:3010` | `http://localhost:3000` |
| API | `http://localhost:4010/api` | `http://localhost:4000/api` |
| PostgreSQL | `localhost:5435` / `mecatrack_dev` | `localhost:5434` / `mecatrack` |

## Prerequisites

- Node.js 20+
- Docker (PostgreSQL 16)

## Environment variables

Copy `.env.example` to `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh token signing (reserved) |
| `JWT_ACCESS_TTL` | Access token TTL (default `15m`) |
| `JWT_REFRESH_TTL` | Refresh token TTL (default `7d`) |
| `PORT` | API port (default `4010` in this repo) |
| `CORS_ORIGIN` | Frontend origin (default `http://localhost:3010`) |
| `NODE_ENV` | `development` or `production` |
| `ALLOW_DESTRUCTIVE_DB_OPS` | Must be `true` to run destructive Prisma cleanup scripts (never in production) |
| `ENFORCE_SECURE_CONFIG` | When `true`, applies production-strict secret validation even in development |
| `ENABLE_ADMIN_BOOTSTRAP` | Opt-in one-time first-admin creation on empty DB (`true` required) |
| `BOOTSTRAP_ADMIN_EMAIL` | First admin email when bootstrap is enabled |
| `BOOTSTRAP_ADMIN_PASSWORD` | First admin password when bootstrap is enabled (min 8 chars) |
| `BOOTSTRAP_ADMIN_NAME` | First admin full name when bootstrap is enabled |

### Production / strict secret validation (US-011)

When `NODE_ENV=production` or `ENFORCE_SECURE_CONFIG=true`, API startup fails fast unless:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are present, ≥ 32 characters, and not committed placeholders
- `DATABASE_URL` includes a non-trivial database password

Development may keep local placeholders. Never reuse `change-me-*`, Docker example JWT defaults, or password `mecatrack` in production.

PostgreSQL in this repo binds to `127.0.0.1:5435` only. A hardened production compose example (not live) lives at `docker-compose.production.example.yml`.

### HTTP and runtime hardening (US-014)

- Login failures for wrong credentials and inactive accounts both return HTTP `401` with `Invalid email or password` (no account-state enumeration).
- The API uses `helmet` security headers. Set `ENABLE_HSTS=true` only when the site is served over HTTPS.
- `apps/api/Dockerfile` runs the API process as non-root user `nestjs` (uid 1001).

## Local setup

From repository root:

```bash
docker compose up -d
```

From `apps/api`:

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

API base URL: `http://localhost:4010/api`

## Seed users (development only)

| Email | Password | Role |
|-------|----------|------|
| `admin@taller.com` | `AdminPass123` | ADMIN |
| `mechanic@taller.com` | `MechanicPass123` | MECHANIC |
| `inactive@taller.com` | `InactivePass123` | MECHANIC (inactive) |

Demo data is loaded **only** with an explicit command:

```bash
npm run db:seed:dev
# or
npx prisma db seed
```

`db:seed:dev` is blocked when `NODE_ENV=production`. Re-running seed preserves existing user password hashes (demo passwords apply on create only).

### Database startup flows (US-010)

| Flow | Command | When |
|------|---------|------|
| Migrate | `npm run db:migrate:deploy` | Schema only (safe for production startup) |
| Bootstrap first admin | `npm run db:bootstrap:admin` | Empty `User` table only; requires `ENABLE_ADMIN_BOOTSTRAP=true` + `BOOTSTRAP_ADMIN_*` |
| Dev seed | `npm run db:seed:dev` | Development/test sample data only |
| Container startup | `docker-entrypoint.sh` | Migrates, optionally bootstraps, **never** runs seed |

`apps/api/docker-entrypoint.sh` is the production-safe startup template: migrate → optional bootstrap → start API. It never executes development seed.

## Destructive database cleanup (development/test only)

The script `prisma/clean-db-admin-only.ts` deletes business data and non-admin users. It keeps `admin@taller.com` when present and **does not reset** the admin password.

Safety gates (all required):

1. `NODE_ENV` must **not** be `production`
2. `ALLOW_DESTRUCTIVE_DB_OPS=true`
3. Explicit confirmation flag: `--confirm` (or `--yes`)

Before mutating, the script prints a sanitized target summary (`host`, `port`, `database`, `NODE_ENV`) without credentials.

Example (from `apps/api`, against the development database only):

```bash
# Windows PowerShell
$env:ALLOW_DESTRUCTIVE_DB_OPS='true'
npm run db:clean:destructive -- --confirm
```

```bash
# bash
ALLOW_DESTRUCTIVE_DB_OPS=true npm run db:clean:destructive -- --confirm
```

This script must never be used against production.

## Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login; returns `accessToken` + sets `refreshToken` httpOnly cookie |
| `POST` | `/api/auth/refresh` | Rotates refresh cookie and returns a new `accessToken` |
| `POST` | `/api/auth/logout` | Revokes refresh token and bumps `sessionVersion` (Bearer required) |
| `GET` | `/api/auth/me` | Current user profile (Bearer required) |

## User management (US-002, admin only)

All `/api/users` routes require a valid Bearer token with role `ADMIN`. Mechanics receive `403 Forbidden`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users (active first, then by name) |
| `POST` | `/api/users` | Create active employee (`ADMIN` or `MECHANIC`) |
| `PATCH` | `/api/users/:id/deactivate` | Soft-deactivate user, revoke refresh tokens, and bump `sessionVersion` |

Access JWTs include `sessionVersion`. Protected routes re-check the user in the database and reject tokens when the user is inactive or the version no longer matches. Refresh tokens rotate on every successful `POST /auth/refresh`; reusing the previous cookie returns `401`. Deactivated users cannot log in or refresh sessions. The last active administrator cannot be deactivated. Admins cannot deactivate their own account. A future role-change endpoint should bump `sessionVersion` the same way as deactivation.

OpenAPI fragment: [`docs/api-spec.users.yml`](../../docs/api-spec.users.yml)

## Client management (US-003, admin and mechanic)

All `/api/clients` routes require a valid Bearer token with role `ADMIN` or `MECHANIC`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/clients/search?q=` | Search by name, national ID fragment, or phone digits |
| `GET` | `/api/clients/search?nationalId=` | Exact national ID lookup |
| `GET` | `/api/clients/:id` | Get client by ID |
| `POST` | `/api/clients` | Create a new client |
| `PATCH` | `/api/clients/:id` | Update client (`fullName`, `phone`, `email`; `nationalId` immutable) |

Search requires at least one of `q` or `nationalId`. Duplicate `nationalId` returns `409` with an `existingClient` object in the response body.

### Examples

```bash
# Search by name
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/clients/search?q=Juan"

# Create client
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"New Client","nationalId":"9-8765-4321","phone":"88881234"}' \
  http://localhost:4000/api/clients
```

OpenAPI fragment: [`docs/api-spec.clients.yml`](../../docs/api-spec.clients.yml)

## Vehicle management (US-004, admin and mechanic)

All `/api/vehicles` routes require a valid Bearer token with role `ADMIN` or `MECHANIC`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/vehicles/search?q=` | Search by license plate fragment |
| `GET` | `/api/vehicles/search?licensePlate=` | Exact plate lookup |
| `GET` | `/api/vehicles/:id` | Get vehicle with `currentOwner` |
| `GET` | `/api/vehicles/:id/history` | Visit history from work orders |
| `POST` | `/api/vehicles` | Create vehicle + initial ownership |
| `PATCH` | `/api/vehicles/:id` | Update vehicle (`licensePlate`, `brand`, `model`, `year`, `color`) |
| `DELETE` | `/api/vehicles/:id` | Delete vehicle if no work orders (204) |

Plates are stored normalized (uppercase, no spaces). Duplicate plate returns `409` with `existingVehicle`. Create with unknown `clientId` returns `404`.

### Examples

```bash
# Search by plate
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/vehicles/search?licensePlate=ABC123"

# Create vehicle for existing client
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"licensePlate":"DEF456","brand":"Toyota","model":"Yaris","year":2021,"clientId":"CLIENT_UUID"}' \
  http://localhost:4000/api/vehicles
```

OpenAPI fragment: [`docs/api-spec.vehicles.yml`](../../docs/api-spec.vehicles.yml)

## Work order management (US-005, admin and mechanic)

All `/api/work-orders` routes require a valid Bearer token with role `ADMIN` or `MECHANIC`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/work-orders/mechanics` | List active mechanics for assignment |
| `GET` | `/api/work-orders/active?vehicleId=` | Active work order for vehicle (or `null`) |
| `POST` | `/api/work-orders` | Create work order + initial tasks (transactional) |
| `GET` | `/api/work-orders/:id` | Work order detail with tasks and `totalAmount` |
| `POST` | `/api/work-orders/:workOrderId/tasks` | Add task (`EN_PROCESO` only) |
| `PATCH` | `/api/work-orders/:workOrderId/tasks/:taskId` | Update task status / complete with cost |
| `PATCH` | `/api/work-orders/:workOrderId/tasks/:taskId/technical-notes` | Update task diagnosis/repair/parts/notes |
| `PATCH` | `/api/work-orders/:workOrderId/visit-notes` | Update visit-level technical notes |

Business rules:

- Only one active work order per vehicle (`EN_PROCESO` or `LISTA_PARA_ENTREGA`).
- `ownerClientId` is snapshotted from the vehicle's current owner at check-in.
- `createdById` comes from the JWT — never from the request body.
- Duplicate active work order returns `409` with `activeWorkOrderId` in the response.
- Task mutations allowed only when work order status is `EN_PROCESO`.
- Completing a task requires `cost` ≥ 0; optional `costNotes`.
- When all tasks are `COMPLETED`, work order auto-transitions to `LISTA_PARA_ENTREGA`.
- `totalAmount` = sum of completed task costs (0 if none).
- Technical notes (US-007): editable only when WO is `EN_PROCESO`; task notes not editable when task is `COMPLETED`.
- Technical note fields max 5000 characters; `null` or empty string clears a field; omitted fields unchanged on PATCH.
- Technical notes do not block task completion (US-006).

### Examples

```bash
# List mechanics
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/work-orders/mechanics

# Check active work order for vehicle
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/work-orders/active?vehicleId=VEHICLE_UUID"

# Create work order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":"VEHICLE_UUID","entryReason":"Oil change and inspection","mileage":45000,"initialTasks":[{"description":"Change engine oil"}]}' \
  http://localhost:4000/api/work-orders

# Add task to work order
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Rotate tires"}' \
  http://localhost:4000/api/work-orders/WORK_ORDER_UUID/tasks

# Complete task with cost
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED","cost":85.50,"costNotes":"Includes labor"}' \
  http://localhost:4000/api/work-orders/WORK_ORDER_UUID/tasks/TASK_UUID

# Update task technical notes
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis":"Worn pads","repairPerformed":"Replaced front pads","partsUsed":"Pad kit"}' \
  http://localhost:4000/api/work-orders/WORK_ORDER_UUID/tasks/TASK_UUID/technical-notes

# Update visit-level notes
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visitDiagnosis":"General inspection","visitRepairSummary":"Brake service"}' \
  http://localhost:4000/api/work-orders/WORK_ORDER_UUID/visit-notes
```

> **Note:** The readme `task-notes` logical module is implemented as `work-order-technical-notes` inside the `work-orders` Nest module.

OpenAPI fragment: [`docs/api-spec.work-orders.yml`](../../docs/api-spec.work-orders.yml)

## Delivery panel (US-008, admin only)

All `/api/delivery` routes require a valid Bearer token with role `ADMIN`. Mechanics receive `403 Forbidden`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/delivery/ready` | List work orders `LISTA_PARA_ENTREGA` with owner contact data |
| `GET` | `/api/delivery/ready/:workOrderId` | Detail for expanded panel row (tasks + totals) |
| `PATCH` | `/api/delivery/ready/:workOrderId/deliver` | Mark `ENTREGADA` and set `deliveredAt` |

Business rules:

- Panel lists only `LISTA_PARA_ENTREGA` work orders (not `OWNER_CONTACTED` in MVP).
- `ownerPhone` is always present in list items (nullable when client has no phone); sourced from `ownerClient` snapshot at check-in.
- `totalAmount` reuses `calculateTotalAmount` from work-orders (sum of completed task costs).
- `elapsedLabel` is a Spanish human-readable duration since `checkedInAt`.
- `deliveredAt` is set server-side only; double deliver returns `409`.
- After delivery, vehicle is released for a new active work order (US-005).
- **V2 D1:** `OWNER_CONTACTED`, `ownerContactedAt`, `ownerContactedById` reserved for mark-contacted flow (not implemented).

### Examples

```bash
# List ready for delivery
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/delivery/ready

# Sort by total amount descending
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/delivery/ready?sort=totalAmount&order=desc"

# Get detail
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/delivery/ready/WORK_ORDER_UUID

# Mark delivered
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/delivery/ready/WORK_ORDER_UUID/deliver
```

OpenAPI fragment: [`docs/api-spec.delivery.yml`](../../docs/api-spec.delivery.yml)

## History (US-009, admin and mechanic)

Read-only consolidated history endpoints. No mutation routes in the `history` module.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/vehicles/:id/history` | Full visit timeline with tasks, notes, amounts, owner snapshots |
| `GET` | `/api/clients/:id` | Client profile + active vehicles + last visit summary |

### Vehicle history contract

- Includes **all** work order statuses (`EN_PROCESO`, `LISTA_PARA_ENTREGA`, `OWNER_CONTACTED`, `ENTREGADA`).
- Visits ordered by `checkedInAt` DESC.
- `ownerAtVisit` comes from `ownerClientId` snapshot at check-in — **not** the vehicle's current owner (D3 integrity).
- `currentOwner` reflects active `VehicleOwnership` (`validTo IS NULL`).
- `statusLabel` is Spanish; `status` remains the enum value.
- `totalAmount` per visit uses `calculateTotalAmount` (sum of completed task costs).
- Empty history returns `{ visits: [], total: 0 }` with `200`.

### Client profile extension

`GET /api/clients/:id` now includes `vehicles[]` with `lastVisitAt` and `lastVisitStatus` per active vehicle (ownership `validTo IS NULL`). Sold/transferred vehicles are excluded from the client profile; access their history via vehicle plate search.

### Examples

```bash
# Full vehicle visit timeline
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/vehicles/VEHICLE_UUID/history

# Client profile with owned vehicles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/clients/CLIENT_UUID
```

OpenAPI fragment: [`docs/api-spec.history.yml`](../../docs/api-spec.history.yml)

## Seed clients (development only)

| Name | National ID | Phone | Email |
|------|-------------|-------|-------|
| Juan Pérez | `1-2345-6789` | `88887777` | `juan@email.com` |
| María López | `2-3456-7890` | `77776666` | — |
| Carlos Ruiz | `3-4567-8901` | — | `carlos@email.com` |

## Seed vehicles (development only)

| Plate | Brand | Model | Year | Owner |
|-------|-------|-------|------|-------|
| `ABC123` | Toyota | Corolla | 2018 | Juan Pérez |
| `XYZ789` | Honda | Civic | 2020 | María López |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with watch mode |
| `npm run build` | Compile TypeScript |
| `npm test` | Unit tests |
| `npm run test:e2e` | E2E tests (requires PostgreSQL) |
| `npm run prisma:migrate` | Run migrations |
| `npm run prisma:seed` | Seed database |

## Database port

Docker maps PostgreSQL to host port **5435** in development (`mecatrack-postgres-dev`). Production uses **5434**.
