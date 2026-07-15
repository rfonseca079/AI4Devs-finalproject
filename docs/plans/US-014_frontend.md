# Frontend Implementation Plan: US-014 HTTP and Runtime Hardening

## Overview

Align the frontend auth UX and regression coverage with backend hardening changes: unified external login failure behavior, explicit HTTP security headers, and a hardened API runtime. The frontend work is modest but real, especially around auth error mapping and verification that the web app continues to behave correctly against the hardened API.

**Architecture principles:** keep auth UX consistent, preserve the shared `apiClient` and auth feature structure, and treat backend header/runtime changes as compatibility constraints rather than frontend business logic.

**User story reference:** [`us/seguridad/US-014-http-and-runtime-hardening.md`](../../us/seguridad/US-014-http-and-runtime-hardening.md)

**Backend dependency:** `US-014_backend` must define the final login failure contract and API hardening behavior.

---

## Architecture Context

### Components/services involved

- `apps/web/src/features/auth/utils/mapAuthError.ts`
- `apps/web/src/features/auth/hooks/useLogin.ts`
- `apps/web/src/features/auth/components/LoginForm.tsx`
- `apps/web/src/shared/lib/apiClient.ts`
- `apps/web/src/features/auth/context/AuthProvider.tsx`
- Playwright auth coverage

### Files referenced

- `apps/web/src/app/login/page.tsx`
- `apps/web/playwright.config.ts`

### Routing considerations

- Login routing remains the same.
- Error messaging on `/login` may need to change if inactive-account responses become externally generic.

### State management approach

No storage-model change is expected. This story mainly affects error interpretation and regression verification.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the frontend feature branch.
- **Branch Naming:** `feature/US-014-frontend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-014-frontend`.
  3. Verify the active branch before changes.

### Step 1: Update login error mapping

- **Files:** `apps/web/src/features/auth/utils/mapAuthError.ts`, `useLogin.ts`, `LoginForm.tsx`
- **Action:** Align frontend login UX with the new backend failure contract.
- **Function/Component Signature:** auth error mapping helpers and login flow
- **Implementation Steps:**
  1. Review current mapping for `401`, `403`, and `429`.
  2. Remove any UI assumption that inactive accounts are externally distinguishable at login if the backend now returns a generic auth failure.
  3. Keep the user-facing copy clear and concise.
- **Dependencies:** backend login response contract
- **Implementation Notes:** Preserve a good UX while avoiding user enumeration behavior.

### Step 2: Verify API hardening does not break frontend integration

- **Files:** `apiClient.ts`, auth service usage, proxy route if needed
- **Action:** Confirm the frontend continues to function with explicit security headers and hardened API runtime.
- **Function/Component Signature:** existing shared API client
- **Implementation Steps:**
  1. Verify no fetch or proxy behavior breaks under the new header set.
  2. Confirm auth cookies and API calls continue to work as before.
  3. Validate that no frontend workaround is needed for the non-root API runtime change.
- **Dependencies:** backend hardening implementation
- **Implementation Notes:** This is mainly a compatibility-validation step.

### Step 3: Update auth regression tests

- **Files:** Playwright auth specs
- **Action:** Reflect the new externally generic login behavior in E2E assertions.
- **Function/Component Signature:** auth test scenarios
- **Implementation Steps:**
  1. Update invalid-email and wrong-password expectations if needed.
  2. Update inactive-account expectations if the backend no longer exposes a distinct external message.
  3. Keep role-protection and logout flows intact.
- **Dependencies:** Playwright auth tests
- **Implementation Notes:** Tests should assert the intended security behavior, not the old implementation detail.

### Step 4: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update any frontend auth documentation that mentions special inactive-account messaging.
  2. Note any compatibility checks relevant to API hardening.
  3. Keep all technical docs in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Update login error mapping
3. Step 2: Verify API hardening compatibility
4. Step 3: Update auth regression tests
5. Step 4: Update documentation

---

## Testing Checklist

- [ ] Invalid email and wrong password show the expected generic login message
- [ ] Inactive-account login no longer leaks extra state if backend response was generalized
- [ ] Auth cookies and API calls still work with the hardened API
- [ ] Playwright auth coverage matches the new backend contract

---

## Error Handling Patterns

- `401` login failures should map to a generic user-facing message.
- `403` should remain reserved for real authorization failures after authentication.
- Keep `429` handling unchanged for rate-limiting UX unless the backend contract changes.

---

## UI/UX Considerations

- Keep the login experience simple and predictable.
- Avoid any UI wording that allows users to infer account existence or status.
- Preserve accessible error rendering in the login form.

---

## Dependencies

- Existing auth feature modules
- Playwright auth tests
- Backend hardening changes from `US-014_backend`

---

## Notes

- This story is small on the frontend, but it is important because stale E2E assertions or outdated messaging can reintroduce information leakage.
- No routing or state-storage redesign is expected here.

---

## Next Steps After Implementation

1. Re-run the full auth regression suite.
2. Confirm the security report findings 7 and 8 are closed from an observable frontend perspective.

---

## Implementation Verification

### Code Quality

- [ ] Error mapping remains centralized and simple

### Functionality

- [ ] Login UX matches the hardened backend response model

### Testing

- [ ] Auth E2E tests pass with updated assertions

### Integration

- [ ] Frontend remains compatible with API hardening headers and runtime changes

### Documentation updates completed

- [ ] Frontend auth docs reflect the new externally generic login behavior
