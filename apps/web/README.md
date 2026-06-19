# MecaTrack Web

Next.js frontend for MecaTrack (US-001: authentication, US-002: user management).

## Prerequisites

- Node.js 20+
- US-001 backend running at `http://localhost:4000`

## Environment

Copy `.env.local.example` to `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

API requests are proxied to the backend via `src/app/api/[...path]/route.ts` so refresh cookies work same-origin on port 3000.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Seed users (via API)

| Email | Password | Role |
|-------|----------|------|
| `admin@taller.com` | `AdminPass123` | ADMIN |
| `mechanic@taller.com` | `MechanicPass123` | MECHANIC |
| `inactive@taller.com` | `InactivePass123` | MECHANIC (inactive) |

## Auth flow

1. User submits login form → `POST /api/auth/login`
2. Access token stored **in memory**; refresh token in `httpOnly` cookie
3. On app load, `AuthProvider` calls `POST /api/auth/refresh` then `GET /api/auth/me`
4. On API `401`, `apiClient` retries once after refresh; failure → `/login?session=expired`
5. Logout → `POST /api/auth/logout` and clear local session

## E2E tests

Requires API + database running:

```bash
# Terminal 1 — API
cd ../api && npm run dev

# Terminal 2 — Web + Playwright
npm run test:e2e
```

## Routes

| Route | Access |
|-------|--------|
| `/login` | Public |
| `/admin/dashboard` | ADMIN |
| `/admin/users` | ADMIN |
| `/mechanic/dashboard` | MECHANIC |
| `/403` | Forbidden |

## User management (US-002)

- **Route:** `/admin/users` (admin only; nav link **Usuarios** in admin layout)
- **Features:** list users, create employee (modal), soft-deactivate with confirmation
- **React Query keys:** `['users']` (invalidated after create/deactivate)
- **Requires:** US-002 backend (`GET/POST /api/users`, `PATCH /api/users/:id/deactivate`)

Mechanics do not see the Usuarios link and are redirected to `/403` if they open `/admin/users` directly.
