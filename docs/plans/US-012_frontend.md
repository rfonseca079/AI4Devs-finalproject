# Frontend Implementation Plan: US-012 Session Revocation and Token Rotation

## Overview

Update the frontend auth session layer to work with backend-enforced immediate revocation and refresh-token rotation. The main frontend responsibilities are to consume the rotated refresh cookie correctly, clear stale local auth state on revocation, and provide a predictable redirect back to login when a session is invalidated server-side.

**Architecture principles:** keep auth logic centralized in `apiClient`, `authApi`, and `AuthProvider`; preserve in-memory access-token storage; and make session-expired handling consistent across routes.

**User story reference:** [`us/seguridad/US-012-session-revocation-and-token-rotation.md`](../../us/seguridad/US-012-session-revocation-and-token-rotation.md)

**Backend dependency:** `US-012_backend` must provide rotated refresh-cookie behavior and immediate revocation responses.

---

## Architecture Context

### Components/services involved

- `apps/web/src/shared/lib/apiClient.ts`
- `apps/web/src/shared/lib/tokenStore.ts`
- `apps/web/src/features/auth/services/authApi.ts`
- `apps/web/src/features/auth/context/AuthProvider.tsx`
- `apps/web/src/features/auth/hooks/useAuth.ts`
- `apps/web/src/features/auth/hooks/useLogin.ts`
- `apps/web/src/features/auth/utils/mapAuthError.ts`
- `apps/web/src/shared/components/ProtectedRoute.tsx`

### Files referenced

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/403/page.tsx`
- Playwright auth E2E coverage

### Routing considerations

- Revoked sessions should redirect to `/login?session=expired`.
- Users downgraded or deactivated mid-session should lose access to protected routes on the next protected interaction.

### State management approach

- Access token remains in memory only.
- Refresh token remains an `httpOnly` cookie managed by the API.
- User state remains in `AuthProvider`.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the frontend feature branch.
- **Branch Naming:** `feature/US-012-frontend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-012-frontend`.
  3. Verify the active branch.

### Step 1: Harden refresh handling in `apiClient`

- **File:** `apps/web/src/shared/lib/apiClient.ts`
- **Action:** Make refresh retry logic compatible with rotated refresh cookies and revocation.
- **Function/Component Signature:** `apiClient<T>(path: string, options?: RequestInit, retry?: boolean): Promise<T>`
- **Implementation Steps:**
  1. Keep a single in-flight refresh promise to avoid concurrent refresh storms.
  2. Continue using `credentials: 'include'` so the rotated cookie is automatically sent and received.
  3. On protected-request `401`, attempt one refresh and retry once only.
  4. If refresh fails, clear local token state and redirect to `/login?session=expired`.
- **Dependencies:** `tokenStore`, existing refresh flow
- **Implementation Notes:** Do not assume the old refresh token remains valid after a successful refresh.

### Step 2: Align `authApi` and `AuthProvider` with revocation behavior

- **Files:** `authApi.ts`, `AuthProvider.tsx`, `useAuth.ts`
- **Action:** Centralize the user-state reset path for revoked sessions.
- **Function/Component Signature:** existing auth context methods
- **Implementation Steps:**
  1. Ensure logout clears user state and access token deterministically.
  2. Ensure revoked-session detection also clears user state, not only the access token.
  3. If `me()` fails after refresh failure, transition to unauthenticated state cleanly.
- **Dependencies:** auth context and service methods
- **Implementation Notes:** The UI should never continue showing stale user role data after server revocation.

### Step 3: Handle forced access loss in protected routes

- **File:** `apps/web/src/shared/components/ProtectedRoute.tsx`
- **Action:** Make role-loss and session-loss UX consistent after backend invalidation.
- **Function/Component Signature:** `ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps)`
- **Implementation Steps:**
  1. Preserve loading state while auth resolution is in progress.
  2. Redirect unauthenticated users to `/login` with optional return URL only for normal unauthenticated flows.
  3. Ensure revoked or expired sessions route through the `session=expired` login path when triggered by API failures.
  4. Preserve `/403` behavior for users who are authenticated but currently unauthorized.
- **Dependencies:** `useAuth`, router helpers
- **Implementation Notes:** After a downgrade, the frontend should not keep rendering admin-only UI.

### Step 4: Update login/session messaging

- **Files:** `mapAuthError.ts`, `LoginForm.tsx`, possibly login page banner logic
- **Action:** Add clear UX for expired or revoked sessions.
- **Function/Component Signature:** auth error mapping helpers
- **Implementation Steps:**
  1. Add or confirm a login banner for `session=expired`.
  2. Keep login form messages generic and user-friendly.
  3. Ensure session-expired feedback is distinct from initial invalid credentials.
- **Dependencies:** existing auth error mapping
- **Implementation Notes:** This is a UX improvement, not a change to access-token storage rules.

### Step 5: Add frontend regression coverage

- **Files:** Playwright auth E2E tests
- **Action:** Test the new revocation and rotation UX contract.
- **Function/Component Signature:** auth e2e scenarios
- **Implementation Steps:**
  1. Test normal login and refresh still succeed.
  2. Test revoked session redirects to login with expired-session indication.
  3. Test role downgrade removes admin access on the next protected interaction.
  4. Test logout keeps the user signed out cleanly.
- **Dependencies:** backend test hooks or deterministic fixtures
- **Implementation Notes:** Some scenarios may require backend test setup helpers or seeded state preparation.

### Step 6: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Document the frontend session-expired behavior.
  2. Update auth-flow docs to mention refresh-token rotation.
  3. Keep all technical docs in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Harden `apiClient` refresh handling
3. Step 2: Align auth context and services
4. Step 3: Update protected-route handling
5. Step 4: Improve expired-session messaging
6. Step 5: Add E2E regression coverage
7. Step 6: Update documentation

---

## Testing Checklist

- [ ] Normal login still succeeds
- [ ] Protected request with expired access token refreshes successfully
- [ ] Revoked session clears auth state and redirects to login
- [ ] Role downgrade removes access to admin-only routes
- [ ] Logout leaves the app in a clean unauthenticated state
- [ ] No stale user role remains visible after revocation

---

## Error Handling Patterns

- `401` on a protected request should trigger one refresh attempt only.
- `401` from refresh should clear session and redirect to `/login?session=expired`.
- `403` should continue to map to authorization failure (`/403`) when the user is authenticated but not allowed.
- Avoid infinite retry loops on auth failures.

---

## UI/UX Considerations

- Show a clear, short banner when the session expired or was revoked.
- Preserve current loading states during auth resolution.
- Keep auth flows accessible and avoid flashing protected content while session state is being resolved.

---

## Dependencies

- Existing auth feature modules
- Playwright auth coverage
- Backend revocation and rotation support

---

## Notes

- This is the main frontend security implementation story in the set.
- The frontend must treat refresh cookies as rotated by the server and should not cache assumptions about them.
- Keep access tokens in memory only.

---

## Next Steps After Implementation

1. Run the full auth regression suite.
2. Move to `US-014_frontend` for login-error and hardening-alignment cleanup.

---

## Implementation Verification

### Code Quality

- [ ] Session handling remains centralized in auth services and provider
- [ ] No token values are logged or persisted insecurely

### Functionality

- [ ] Revocation and rotation behave correctly from the user perspective

### Testing

- [ ] E2E coverage validates revocation and logout flows

### Integration

- [ ] Frontend remains compatible with rotated refresh cookies from the backend

### Documentation updates completed

- [ ] Auth-flow docs reflect session expiration and refresh rotation
