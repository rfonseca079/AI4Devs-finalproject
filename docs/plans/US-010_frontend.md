# Frontend Implementation Plan: US-010 Secure Production Bootstrap

## Overview

US-010 is primarily a backend and deployment hardening story, but the frontend must stop depending implicitly on demo seed behavior and must keep authentication regression coverage stable after the bootstrap split. The plan focuses on removing frontend assumptions about seeded production users and aligning local/test setup with the new explicit backend bootstrap model.

**Architecture principles:** the frontend remains a consumer of backend auth flows through `authApi`, `apiClient`, and Playwright-based end-to-end verification; no production UI should rely on automatic backend seeding.

**User story reference:** [`us/seguridad/US-010-secure-production-bootstrap.md`](../../us/seguridad/US-010-secure-production-bootstrap.md)

**Out of scope:** new frontend screens, user-facing bootstrap controls, or direct UI management of production initialization.

---

## Architecture Context

### Components/services involved

- `apps/web/src/features/auth/services/authApi.ts`
- `apps/web/src/features/auth/context/AuthProvider.tsx`
- `apps/web/src/shared/lib/apiClient.ts`
- `apps/web/playwright.config.ts`
- frontend auth E2E flows and any test fixtures that assume seeded credentials

### Files referenced

- `apps/web/.env.local.example`
- `apps/web/README.md`
- `readme.md`
- Any Playwright auth specs or test setup files using demo users

### Routing considerations

No new routes are expected. Existing login and protected-route behavior must continue to work after backend bootstrap changes.

### State management approach

Existing auth state remains unchanged: access token in memory, refresh token in cookie, user state via `AuthProvider`.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the frontend feature branch.
- **Branch Naming:** `feature/US-010-frontend`
- **Implementation Steps:**
  1. Update the team base branch.
  2. Create `feature/US-010-frontend`.
  3. Verify the active branch before changes.
- **Notes:** Keep frontend work isolated from the backend bootstrap branch.

### Step 1: Audit frontend assumptions about seeded data

- **File:** `apps/web` auth tests, docs, and local setup references
- **Action:** Identify any frontend dependency on always-available seeded users.
- **Function/Component Signature:** N/A
- **Implementation Steps:**
  1. Review auth-related Playwright tests and local setup docs.
  2. Identify references to demo users that are acceptable only in development/test.
  3. Separate test-only assumptions from production guidance.
- **Dependencies:** Playwright config, auth flows
- **Implementation Notes:** The goal is to remove implicit coupling, not necessarily remove all dev seed references.

### Step 2: Align frontend environment and setup guidance

- **File:** `apps/web/.env.local.example`, `apps/web/README.md`
- **Action:** Update frontend-facing setup instructions to match the explicit backend startup model.
- **Function/Component Signature:** N/A
- **Implementation Steps:**
  1. Clarify that login-ready users in local/dev depend on explicit dev seed execution.
  2. Ensure public env files reference API location only and do not imply production bootstrap behavior.
  3. Keep any demo-user references clearly marked as development-only.
- **Dependencies:** API URL configuration, local stack documentation
- **Implementation Notes:** No secret or bootstrap-only backend variable should appear in frontend public env files.

### Step 3: Stabilize auth regression tests

- **File:** Playwright auth specs or setup helpers
- **Action:** Make test setup explicit instead of relying on production-like startup seeding.
- **Function/Component Signature:** auth E2E scenarios
- **Implementation Steps:**
  1. Ensure test scenarios use known development/test fixtures only.
  2. If tests assume users exist, document that they rely on `seed-dev` or equivalent explicit setup.
  3. Keep login, logout, and protected-route coverage intact after the backend bootstrap split.
- **Dependencies:** Playwright, backend local dev/test setup
- **Implementation Notes:** Prefer deterministic setup over implicit environment state.

### Step 4: Verify no application-code changes are required

- **File:** `apps/web/src/features/auth/services/authApi.ts`, `apps/web/src/shared/lib/apiClient.ts`
- **Action:** Confirm the frontend auth client remains compatible with the backend after startup-flow changes.
- **Function/Component Signature:** existing auth service methods
- **Implementation Steps:**
  1. Verify endpoints and cookie behavior are unchanged by the backend refactor.
  2. Confirm no frontend runtime logic depends on seeded production users.
  3. Document explicitly if no component or service code change is needed.
- **Dependencies:** existing auth API contract
- **Implementation Notes:** This step may result in documentation/testing-only changes, which is acceptable.

### Step 5: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update any frontend setup notes that assume automatic user seeding.
  2. Clarify development-only demo credential usage if still used for E2E.
  3. Ensure documentation remains in English.
- **References:** `docs/documentation-standards.mdc`
- **Notes:** Mandatory even if no React code changes are required.

---

## Implementation Order

1. Step 0: Create feature branch
2. Step 1: Audit frontend assumptions
3. Step 2: Align env and setup guidance
4. Step 3: Stabilize auth regression tests
5. Step 4: Verify runtime compatibility
6. Step 5: Update documentation

---

## Testing Checklist

- [ ] Login flow still works against the local dev backend after explicit seed setup
- [ ] Auth E2E tests no longer rely on implicit production startup seeding
- [ ] Demo credentials, if documented, are clearly marked as development-only
- [ ] No frontend public env file contains bootstrap-only or secret backend values

---

## Error Handling Patterns

- Preserve existing login and refresh error handling.
- If backend is started without seeded dev users in local development, frontend tests and docs should describe the expected login failure clearly.
- Do not add UI logic that assumes production bootstrap must create users.

---

## UI/UX Considerations

- No new UI is expected.
- Avoid exposing operational bootstrap concepts in the product interface.
- Keep user-facing authentication flows unchanged.

---

## Dependencies

- Existing Next.js auth feature modules
- Playwright configuration
- Local backend dev/test seed flow

---

## Notes

- This is mostly a documentation and regression-plan frontend ticket.
- If implementation reveals hidden runtime coupling to seed behavior, fix that coupling instead of documenting around it.
- Coordinate closely with `US-010_backend`.

---

## Next Steps After Implementation

1. Re-run auth E2E tests against the explicit dev-seed workflow.
2. Continue with `US-012_frontend`, which contains the first substantial frontend security code changes.

---

## Implementation Verification

### Code Quality

- [ ] No frontend code assumes implicit production seeding

### Functionality

- [ ] Auth flows still work in local development with explicit test data setup

### Testing

- [ ] Auth regression coverage remains deterministic

### Integration

- [ ] Frontend setup guidance matches the new backend bootstrap model

### Documentation updates completed

- [ ] Frontend docs reflect explicit dev seed usage where applicable
