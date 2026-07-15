# Backend Implementation Plan: US-014 HTTP and Runtime Hardening

## Overview

Implement the remaining backend hardening baseline by unifying external login failure behavior, adding explicit HTTP security headers, and running the API container as a non-root user. This story closes lower-severity but important defense-in-depth gaps identified in the security review.

**Architecture principles:** preserve current NestJS auth flow, keep externally observable behavior minimal and safe, and harden runtime defaults without breaking the existing web/API integration.

**User story reference:** [`us/seguridad/US-014-http-and-runtime-hardening.md`](../../us/seguridad/US-014-http-and-runtime-hardening.md)

**Out of scope:** MFA, WAF integration, and a full custom CSP rollout.

---

## Architecture Context

### Layers involved

| Layer | Responsibility | Main artifacts |
|-------|----------------|----------------|
| **Presentation** | Login endpoint behavior and global headers | `auth.controller.ts`, `main.ts`, exception filter |
| **Application** | Auth failure rules | `auth.service.ts` |
| **Infrastructure** | Container runtime permissions | production API `Dockerfile` |

### Components/files referenced

- `apps/api/src/main.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/common/filters/http-exception.filter.ts`
- `apps/api/test/auth.e2e-spec.ts`
- `C:\Despliegues\AI4Devs-finalproject\apps\api\Dockerfile`

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the backend feature branch.
- **Branch Naming:** `feature/US-014-backend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-014-backend`.
  3. Verify branch context before edits.

### Step 1: Unify external login failure behavior

- **Files:** `apps/api/src/modules/auth/auth.service.ts`, possibly `auth.controller.ts`
- **Action:** Prevent login responses from revealing inactive-account state externally.
- **Function Signature:** `validateUser(email: string, password: string): Promise<User | null>`
- **Implementation Steps:**
  1. Review current inactive-account behavior.
  2. Change the external login response so invalid email, invalid password, and inactive account are not externally distinguishable.
  3. Preserve internal logging detail for operators if useful.
- **Dependencies:** existing auth service and exception filter
- **Implementation Notes:** Keep secrets and credentials out of logs.

### Step 2: Add HTTP hardening headers

- **File:** `apps/api/src/main.ts`
- **Action:** Register `helmet` or equivalent explicit header hardening.
- **Function Signature:** Nest bootstrap
- **Implementation Steps:**
  1. Add the required dependency if missing.
  2. Enable `helmet` in the Nest app bootstrap.
  3. Review frame, content-type, referrer, and transport-related headers.
  4. Keep the config compatible with the Next.js frontend and current proxy model.
- **Dependencies:** `helmet`
- **Implementation Notes:** Apply HSTS only when production transport assumptions support it.

### Step 3: Review exception and status behavior

- **File:** `apps/api/src/common/filters/http-exception.filter.ts`
- **Action:** Keep auth responses consistent after login behavior changes.
- **Function Signature:** exception filter formatting
- **Implementation Steps:**
  1. Ensure the unified login failure behavior maps cleanly to the chosen status code.
  2. Preserve correct `403` handling for non-login authorization failures.
  3. Keep the standard JSON error shape.
- **Dependencies:** current exception filter
- **Implementation Notes:** Only login failure behavior should be generalized; normal RBAC failures should stay explicit.

### Step 4: Run API container as non-root

- **File:** `C:\Despliegues\AI4Devs-finalproject\apps\api\Dockerfile`
- **Action:** Harden the runtime image so the API process does not run as root.
- **Function Signature:** Dockerfile runner stage
- **Implementation Steps:**
  1. Create a dedicated runtime user and group.
  2. Ensure copied files have correct ownership and permissions.
  3. Run the entrypoint and Node process as the non-root user.
  4. Validate that startup still works with the entrypoint script and built artifacts.
- **Dependencies:** Dockerfile runtime stage
- **Implementation Notes:** Pay attention to file permissions required by the shell entrypoint.

### Step 5: Add verification coverage

- **Files:** `apps/api/test/auth.e2e-spec.ts` and smoke checks
- **Action:** Verify the new hardening behavior.
- **Function Signature:** test suites
- **Implementation Steps:**
  1. Test that invalid email, invalid password, and inactive account now share the same external login failure behavior.
  2. Test or smoke-check that expected hardening headers are present.
  3. Smoke-test the API container running as non-root.
- **Dependencies:** Jest, Supertest, container smoke check
- **Implementation Notes:** Keep tests focused on observable behavior rather than implementation details.

### Step 6: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update security documentation describing login behavior and HTTP headers.
  2. Document the non-root runtime expectation in deployment notes.
  3. Keep docs in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Unify external login failure behavior
3. Step 2: Add HTTP hardening headers
4. Step 3: Review exception/status behavior
5. Step 4: Run API container as non-root
6. Step 5: Add verification coverage
7. Step 6: Update documentation

---

## Testing Checklist

- [ ] Wrong email, wrong password, and inactive account share the same observable login failure pattern
- [ ] Normal authorization failures still behave correctly on protected endpoints
- [ ] Expected security headers are present
- [ ] API container starts successfully as non-root
- [ ] Existing frontend auth flows still function against the hardened API

---

## Error Response Format

The backend should continue using the standard error shape:

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

For non-login authorization failures, keep standard protected-route semantics such as `403 Forbidden` where appropriate.

---

## Partial Update Support

Not applicable. This story changes auth behavior, headers, and container runtime hardening rather than partial resource updates.

---

## Dependencies

- `helmet`
- Existing auth module
- Existing exception filter
- Production API Dockerfile

---

## Notes

- This story is lower priority than startup and secret hardening, but still important.
- Coordinate with `US-014_frontend` because login-message behavior will affect frontend auth error mapping.

---

## Next Steps After Implementation

1. Re-run the security report for low-severity findings.
2. Verify frontend auth messaging stays aligned.

---

## Implementation Verification

### Code Quality

- [ ] Hardening changes are explicit and localized
- [ ] Logging remains free of credentials and tokens

### Functionality

- [ ] Login behavior is safely generalized without breaking auth
- [ ] Container runs successfully as non-root

### Testing

- [ ] E2E and smoke checks pass

### Integration

- [ ] Frontend remains compatible with the new login behavior and headers

### Documentation updates completed

- [ ] Security and deployment docs reflect the hardening baseline
