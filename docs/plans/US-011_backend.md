# Backend Implementation Plan: US-011 Secrets and Database Hardening

## Overview

Harden MecaTrack production configuration so the backend cannot start with predictable JWT secrets or trivial database credentials, and so PostgreSQL is not exposed more broadly than necessary. This story focuses on startup-time validation and Docker deployment hardening.

**Architecture principles:** explicit configuration, fail-fast validation, least-exposed networking, and clear separation between development examples and production requirements.

**User story reference:** [`us/seguridad/US-011-secrets-and-database-hardening.md`](../../us/seguridad/US-011-secrets-and-database-hardening.md)

**Out of scope:** external vault integration, TLS between local Docker containers, and non-Docker deployment platforms.

---

## Architecture Context

### Layers involved

| Layer | Responsibility | Main artifacts |
|-------|----------------|----------------|
| **Infrastructure** | Compose networking and runtime env injection | `docker-compose.yml`, production compose |
| **Application** | Backend env validation at startup | `apps/api/src/app.module.ts`, `apps/api/src/main.ts` |
| **Security** | Secret quality and DB credential rules | env examples and config validation |

### Components/files referenced

- `C:\Despliegues\AI4Devs-finalproject\docker-compose.yml`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/.env.example`
- `.env.example`
- `apps/api/README.md`

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the backend feature branch.
- **Branch Naming:** `feature/US-011-backend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-011-backend`.
  3. Verify branch context before edits.

### Step 1: Remove insecure committed production defaults

- **File:** `C:\Despliegues\AI4Devs-finalproject\docker-compose.yml`
- **Action:** Eliminate predictable fallback secrets and trivial committed DB credentials from production deployment.
- **Function Signature:** N/A
- **Implementation Steps:**
  1. Remove fallback values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
  2. Replace hardcoded DB credentials with required env-driven values.
  3. Preserve current service topology while tightening configuration.
- **Dependencies:** Docker Compose env substitution
- **Implementation Notes:** The production compose file should document required variables, not provide acceptable secret values.

### Step 2: Restrict database host exposure

- **File:** `C:\Despliegues\AI4Devs-finalproject\docker-compose.yml`
- **Action:** Reduce PostgreSQL host exposure to the smallest practical surface.
- **Function Signature:** N/A
- **Implementation Steps:**
  1. Prefer internal-only database networking if host access is unnecessary.
  2. If host access is required, bind the port to `127.0.0.1`.
  3. Verify API-to-DB container communication remains internal to Docker.
- **Dependencies:** Docker networking
- **Implementation Notes:** Do not route API container traffic through the host-mapped DB port.

### Step 3: Add backend startup validation

- **Files:** `apps/api/src/app.module.ts`, `apps/api/src/main.ts` or dedicated config module
- **Action:** Fail fast when production secrets or DB credentials are missing or clearly unsafe.
- **Function Signature:** `validateEnvironment(): void`
- **Implementation Steps:**
  1. Validate required variables in production.
  2. Reject placeholder-like or obviously weak committed values.
  3. Surface clear errors without printing secrets.
  4. Keep development defaults limited to development mode only if still necessary.
- **Dependencies:** Nest ConfigModule
- **Implementation Notes:** Centralize validation rather than scattering checks across multiple files.

### Step 4: Align environment examples

- **Files:** `apps/api/.env.example`, `.env.example`
- **Action:** Keep example files safe and explicit.
- **Function Signature:** N/A
- **Implementation Steps:**
  1. Leave placeholders only in example files.
  2. Differentiate development guidance from production requirements.
  3. Remove any example text that could be mistaken for production-ready secrets.
- **Dependencies:** existing env docs
- **Implementation Notes:** Examples should guide setup without normalizing insecure values.

### Step 5: Add verification tests and smoke checks

- **Files:** backend config tests or integration tests
- **Action:** Prove the hardened configuration behaves correctly.
- **Function Signature:** test suites
- **Implementation Steps:**
  1. Test that production startup fails when required secrets are missing.
  2. Test that production startup fails with placeholder-like values.
  3. Test that startup succeeds when valid secrets are present.
  4. Add a smoke-level check for DB port exposure expectations.
- **Dependencies:** Jest, environment mocking
- **Implementation Notes:** Prefer automated checks for config validation and one deployment smoke test.

### Step 6: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update deployment docs with required production variables.
  2. Update `apps/api/README.md` with startup validation behavior.
  3. Clarify DB exposure model and localhost-only exceptions if used.
  4. Keep all technical docs in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Remove insecure production defaults
3. Step 2: Restrict DB exposure
4. Step 3: Add startup validation
5. Step 4: Align env examples
6. Step 5: Add tests and smoke checks
7. Step 6: Update documentation

---

## Testing Checklist

- [ ] API startup fails in production mode when JWT secrets are missing
- [ ] API startup fails when placeholder-like secrets are used
- [ ] Production compose does not expose PostgreSQL broadly by default
- [ ] API still reaches PostgreSQL over Docker networking
- [ ] Example env files contain placeholders only

---

## Error Response Format

This story affects startup and infrastructure validation more than HTTP responses. Use fail-fast process errors such as:

```json
{
  "error": "Invalid production configuration",
  "details": "JWT_ACCESS_SECRET is required in production"
}
```

- Startup validation should halt the process with non-zero exit status.
- Messages should be actionable and should not reveal secret values.

---

## Partial Update Support

Not applicable. This story changes configuration and infrastructure behavior.

---

## Dependencies

- NestJS ConfigModule
- Docker Compose
- Prisma / PostgreSQL runtime
- Existing production deployment copy

---

## Notes

- Keep production secrets runtime-injected only.
- This story should be coordinated with `US-010_backend` because both affect startup safety.
- Do not weaken development ergonomics in ways that hide production validation gaps.

---

## Next Steps After Implementation

1. Continue with `US-014_backend` for runtime hardening.
2. Review the security report again to confirm the high-severity deployment findings are closed.

---

## Implementation Verification

### Code Quality

- [ ] Config validation is centralized and explicit
- [ ] No committed production-ready secret defaults remain

### Functionality

- [ ] Production startup enforces required secret configuration
- [ ] PostgreSQL exposure matches the intended hardened model

### Testing

- [ ] Config validation tests pass
- [ ] Smoke checks pass

### Integration

- [ ] Dockerized stack still boots correctly with explicit production env values

### Documentation updates completed

- [ ] Deployment docs explain required variables and DB exposure rules
