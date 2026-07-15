# Backend Implementation Plan: US-012 Session Revocation and Token Rotation

## Overview

Implement immediate session invalidation for deactivation and role changes, and rotate refresh tokens on every refresh so stale sessions cannot retain privileges. This story strengthens the current auth flow by making authorization depend on current user state instead of only the originally issued JWT payload.

**Architecture principles:** keep auth logic centered in the NestJS auth module, use Prisma-backed session state, preserve clear controller → service → persistence boundaries, and prefer explicit invalidation over implicit expiry-only behavior.

**User story reference:** [`us/seguridad/US-012-session-revocation-and-token-rotation.md`](../../us/seguridad/US-012-session-revocation-and-token-rotation.md)

**Out of scope:** MFA, user-visible session management, or cross-device session dashboards.

---

## Architecture Context

### Layers involved

| Layer | Responsibility | Main artifacts |
|-------|----------------|----------------|
| **Presentation** | Auth and user endpoints | `auth.controller.ts`, `users.controller.ts`, guards |
| **Application** | Token issuance, rotation, revocation rules | `auth.service.ts`, `users.service.ts` |
| **Domain / Data** | Session state on `User` | Prisma `User` model |
| **Infrastructure** | JWT strategy and cookie handling | `jwt.strategy.ts`, auth constants |

### Components/files referenced

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts`
- `apps/api/src/common/guards/jwt-auth.guard.ts`
- `apps/api/src/common/guards/roles.guard.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/test/auth.e2e-spec.ts`
- `apps/api/test/users.e2e-spec.ts`

### Current risk

The current system stores a single refresh token hash but does not rotate the refresh token on refresh, and access tokens remain valid until expiry even if the user is deactivated or downgraded.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the backend feature branch.
- **Branch Naming:** `feature/US-012-backend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-012-backend`.
  3. Verify the active branch before changes.

### Step 1: Extend the user session model

- **File:** `apps/api/prisma/schema.prisma`
- **Action:** Add a field that invalidates stale access tokens after security-sensitive account changes.
- **Function Signature:** Prisma model update
- **Implementation Steps:**
  1. Add `sessionVersion Int @default(0)` or equivalent to `User`.
  2. Generate and review the migration.
  3. Keep existing refresh-token columns in place.
- **Dependencies:** Prisma Migrate
- **Implementation Notes:** A monotonic session version is simpler than tracking all access-token IDs.

### Step 2: Update token issuance and rotation

- **File:** `apps/api/src/modules/auth/auth.service.ts`
- **Action:** Include session version in JWTs and rotate refresh tokens during refresh.
- **Function Signature:** 
  - `issueTokens(user: User): Promise<{ accessToken: string; refreshToken: string }>`
  - `refresh(refreshToken: string): Promise<RefreshResponseDto>`
- **Implementation Steps:**
  1. Add `sessionVersion` to the access-token payload.
  2. Generate a brand-new refresh token on successful refresh.
  3. Replace the stored refresh-token hash and expiry atomically.
  4. Return the new access token and ensure the controller can reset the cookie.
- **Dependencies:** `crypto`, `JwtService`, Prisma
- **Implementation Notes:** Do not reuse the previous refresh token after a successful refresh.

### Step 3: Validate current user state on protected requests

- **Files:** `jwt.strategy.ts`, `jwt-auth.guard.ts`, `roles.guard.ts`
- **Action:** Reject stale access tokens when user state has changed.
- **Function Signature:** `validate(payload: AccessTokenPayload): Promise<AuthenticatedUser>`
- **Implementation Steps:**
  1. Load current user data from DB using `sub`.
  2. Reject if the user is missing, inactive, or has a different `sessionVersion`.
  3. Ensure downstream auth context reflects the current DB-backed role.
  4. Keep `RolesGuard` aligned with current role state, not only stale token role.
- **Dependencies:** PrismaService, Passport strategy
- **Implementation Notes:** Keep the additional DB lookup focused and minimal.

### Step 4: Invalidate sessions on account changes

- **Files:** `users.service.ts`, `users.controller.ts`
- **Action:** Make deactivation and role updates revoke previously issued sessions.
- **Function Signature:** user management service methods
- **Implementation Steps:**
  1. Bump `sessionVersion` on deactivate.
  2. Clear refresh token state on deactivate.
  3. Add or formalize role update behavior to bump `sessionVersion` when role changes.
  4. Keep self-deactivation and last-admin protections intact.
- **Dependencies:** existing user rules
- **Implementation Notes:** If a role-update endpoint is not yet part of the product surface, document the backend hook clearly for future use.

### Step 5: Update cookie handling in the auth controller

- **File:** `apps/api/src/modules/auth/auth.controller.ts`
- **Action:** Re-issue the refresh cookie on `POST /auth/refresh`.
- **Function Signature:** `refresh(@Req() request, @Res({ passthrough: true }) response)`
- **Implementation Steps:**
  1. Change the refresh response flow so the controller can set the new refresh cookie.
  2. Preserve existing `httpOnly`, `sameSite`, `path`, and `secure` flags.
  3. Ensure logout still clears the active cookie correctly.
- **Dependencies:** Express response cookie helpers
- **Implementation Notes:** Rotation is incomplete if the new cookie is not set in the response.

### Step 6: Add unit and e2e coverage

- **Files:** `auth.service.spec.ts`, `apps/api/test/auth.e2e-spec.ts`, `apps/api/test/users.e2e-spec.ts`
- **Action:** Cover the new revocation and rotation behaviors.
- **Function Signature:** test suites
- **Implementation Steps:**
  1. Unit test refresh rotation and session-version issuance.
  2. E2E test deactivation while logged in.
  3. E2E test role downgrade while logged in.
  4. E2E test refresh-token reuse rejection after rotation.
  5. E2E test logout invalidation.
- **Dependencies:** Jest, Supertest, test DB
- **Implementation Notes:** Cover both direct auth endpoints and protected-route effects.

### Step 7: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update `readme.md` security and auth sections if they describe session behavior.
  2. Update API docs for `POST /auth/refresh` cookie rotation behavior.
  3. Document the invalidation model and session-version field if data-model docs are maintained.
  4. Keep documentation in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Extend schema
3. Step 2: Update token issuance and rotation
4. Step 3: Validate current user state on protected requests
5. Step 4: Invalidate sessions on account changes
6. Step 5: Update auth controller cookie handling
7. Step 6: Add tests
8. Step 7: Update documentation

---

## Testing Checklist

- [ ] Deactivated user loses protected access immediately
- [ ] Downgraded admin loses admin access immediately
- [ ] Refresh rotates the cookie and invalidates the old token
- [ ] Reusing a rotated refresh token returns `401`
- [ ] Logout invalidates subsequent refresh attempts
- [ ] Existing auth flows still work for a normal active user

---

## Error Response Format

Existing auth error shape should remain consistent:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### Expected mappings

- `401` for revoked, expired, invalid, or reused refresh tokens
- `401` or `403` for stale access-token authorization depending on the final guard strategy
- `400` for invalid role-update input

Keep the final mapping consistent across auth and protected-route checks.

---

## Partial Update Support

Partial update support applies only if a role-update endpoint is introduced or formalized. The backend should allow updating `role` without requiring unrelated user fields, while still enforcing business rules and session invalidation.

---

## Dependencies

- Prisma migration support
- `@nestjs/jwt`
- Passport JWT strategy
- Existing auth and users modules
- Jest / Supertest

---

## Notes

- This story is the strongest code-level mitigation for stale privileges.
- Session invalidation must be driven by current DB state, not just JWT expiry.
- Coordinate tightly with frontend handling in `US-012_frontend`.

---

## Next Steps After Implementation

1. Update frontend auth handling to react cleanly to revocation.
2. Re-run security audit scenarios for role changes and deactivation.
3. Consider future optional reuse-detection telemetry if needed.

---

## Implementation Verification

### Code Quality

- [ ] Auth and user modules remain cohesive and type-safe
- [ ] No token values are logged

### Functionality

- [ ] Revocation and rotation work end to end

### Testing

- [ ] Unit and e2e coverage cover the new critical behaviors

### Integration

- [ ] Frontend can continue using refresh-cookie auth with rotation

### Documentation updates completed

- [ ] Auth/session docs reflect rotation and immediate invalidation behavior
