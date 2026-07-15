# Frontend Implementation Plan: US-011 Secrets and Database Hardening

## Overview

US-011 is mostly an infrastructure and backend hardening story, but the frontend must remain correctly configured around public API URLs and must avoid leaking any non-public configuration into browser-exposed environment variables. The frontend plan focuses on env hygiene, proxy alignment, and regression validation.

**Architecture principles:** keep only public-safe values in `NEXT_PUBLIC_*`, preserve clear separation between backend secrets and frontend runtime config, and maintain a predictable API proxy contract.

**User story reference:** [`us/seguridad/US-011-secrets-and-database-hardening.md`](../../us/seguridad/US-011-secrets-and-database-hardening.md)

**Out of scope:** adding a frontend secret-management UI or exposing database connectivity in the browser.

---

## Architecture Context

### Components/services involved

- `apps/web/src/app/api/[...path]/route.ts`
- `apps/web/src/shared/lib/apiClient.ts`
- `apps/web/.env.local.example`
- `apps/web/playwright.config.ts`

### Files referenced

- `apps/web/.env.local.example`
- `apps/web/README.md`
- `readme.md`

### Routing considerations

Existing proxy routing through `/api` must continue to work after backend deployment hardening.

### State management approach

No state-management changes are expected. This story is configuration-focused.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the frontend feature branch.
- **Branch Naming:** `feature/US-011-frontend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-011-frontend`.
  3. Confirm the active branch.

### Step 1: Audit frontend environment exposure

- **File:** `apps/web/.env.local.example`, public env usage across `apps/web`
- **Action:** Ensure frontend configuration exposes only browser-safe values.
- **Function/Component Signature:** N/A
- **Implementation Steps:**
  1. Review all `NEXT_PUBLIC_*` usage.
  2. Confirm that no backend secret, DB credential, or internal-only runtime setting is exposed to the browser.
  3. Verify proxy-related env vars remain server-side only where appropriate.
- **Dependencies:** Next.js env model
- **Implementation Notes:** `NEXT_PUBLIC_API_URL` is acceptable; DB or JWT secrets are not.

### Step 2: Align API proxy and local environment guidance

- **Files:** `apps/web/src/app/api/[...path]/route.ts`, `apps/web/.env.local.example`
- **Action:** Keep the frontend proxy contract stable while backend deployment rules harden.
- **Function/Component Signature:** proxy route handler
- **Implementation Steps:**
  1. Confirm the proxy continues to use a server-side target variable such as `API_PROXY_TARGET`.
  2. Ensure examples describe only public URL expectations for browser code.
  3. Document any local-development differences introduced by backend hardening.
- **Dependencies:** Next.js route handlers, backend API origin
- **Implementation Notes:** The frontend must not infer database exposure rules directly.

### Step 3: Update auth and smoke-test assumptions

- **File:** Playwright config and auth tests
- **Action:** Make sure frontend tests still work with hardened backend startup requirements.
- **Function/Component Signature:** auth test setup
- **Implementation Steps:**
  1. Verify local dev/test setup instructions include the required backend env prerequisites.
  2. Confirm auth E2E tests use the frontend/API contract rather than any direct DB access assumptions.
  3. Document any env setup needed for local regression runs.
- **Dependencies:** Playwright, backend local env
- **Implementation Notes:** No browser code should ever depend on database host/port visibility.

### Step 4: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update frontend setup notes to distinguish public envs from backend secrets.
  2. Clarify proxy configuration expectations for local and deployed environments.
  3. Keep all technical docs in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Audit public env exposure
3. Step 2: Align API proxy guidance
4. Step 3: Update smoke-test assumptions
5. Step 4: Update documentation

---

## Testing Checklist

- [ ] No browser-exposed env variable contains secrets or DB credentials
- [ ] API proxy continues to function with hardened backend configuration
- [ ] Frontend auth and smoke tests remain backend-agnostic beyond normal API usage
- [ ] Setup docs clearly separate public frontend config from backend secret injection

---

## Error Handling Patterns

- Existing API error handling remains unchanged.
- Frontend docs should explain misconfiguration symptoms at a high level without suggesting direct access to backend secrets.
- Keep user-facing errors generic and operational guidance in documentation only.

---

## UI/UX Considerations

- No UI changes are expected.
- Avoid surfacing backend secret-management concepts in the interface.

---

## Dependencies

- Next.js env and route-handler model
- Existing auth proxy flow
- Playwright smoke coverage

---

## Notes

- This is a low-code or no-code frontend plan unless the audit reveals an unsafe public env leak.
- Coordinate with `US-011_backend` before changing any frontend deployment assumptions.

---

## Next Steps After Implementation

1. Move to `US-012_frontend` for the next meaningful frontend security code changes.
2. Re-run login and protected-route regression scenarios.

---

## Implementation Verification

### Code Quality

- [ ] Public env usage is limited to browser-safe values

### Functionality

- [ ] Frontend proxy and auth flows still work after backend deployment hardening

### Testing

- [ ] Smoke tests continue to pass with explicit backend env setup

### Integration

- [ ] Frontend setup guidance aligns with backend secret-injection rules

### Documentation updates completed

- [ ] Frontend env docs clearly separate public and private configuration
