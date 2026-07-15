# Backend Implementation Plan: US-010 Secure Production Bootstrap

## Overview

Implement a safe production bootstrap flow for MecaTrack so the API can start without reseeding demo users or resetting real credentials. The goal is to separate migration, first-admin bootstrap, and development seed behavior into explicit backend flows.

**Architecture principles:** keep startup logic explicit and environment-aware, preserve the current NestJS + Prisma layered backend structure, and prevent operational side effects during normal production restarts.

**User story reference:** [`us/seguridad/US-010-secure-production-bootstrap.md`](../../us/seguridad/US-010-secure-production-bootstrap.md)

**Out of scope:** full secret-manager integration, multi-environment orchestration outside Docker, and user-facing administration screens.

---

## Architecture Context

### Layers involved

| Layer | Responsibility | Main artifacts |
|-------|----------------|----------------|
| **Infrastructure** | Container startup and deployment commands | `apps/api/docker-entrypoint.sh`, `docker-compose.yml` |
| **Application** | Bootstrap and seed orchestration | `apps/api/package.json`, Prisma scripts |
| **Domain / Data** | Safe user creation rules | `apps/api/prisma/seed.ts`, new bootstrap script |

### Components and files referenced

- `apps/api/docker-entrypoint.sh`
- `apps/api/package.json`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/clean-db-admin-only.ts`
- `apps/api/.env.example`
- `.env.example`
- `C:\Despliegues\AI4Devs-finalproject\docker-compose.yml`

### Current risk

The current startup flow runs migrations and then executes `seed.ts`, which can upsert demo users and reset their passwords during a normal production restart.

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the backend feature branch.
- **Branch Naming:** `feature/US-010-backend`
- **Implementation Steps:**
  1. Update the base branch used by the team.
  2. Create `feature/US-010-backend`.
  3. Verify the active branch before any code changes.
- **Notes:** This must be the first implementation step.

### Step 1: Audit and isolate current startup responsibilities

- **Files:** `apps/api/docker-entrypoint.sh`, `apps/api/package.json`, `apps/api/prisma/seed.ts`
- **Action:** Identify which commands are safe for production startup and which mutate business data.
- **Function Signature:** N/A
- **Implementation Steps:**
  1. Confirm that migrations are safe to keep in production startup.
  2. Identify seed responsibilities currently mixed into the startup flow.
  3. Document which parts create demo users and sample business records.
- **Dependencies:** Prisma CLI, current package scripts
- **Implementation Notes:** Treat all data-creating logic as unsafe by default until explicitly classified.

### Step 2: Split Prisma scripts by purpose

- **Files:** `apps/api/prisma/seed.ts`, `apps/api/prisma/bootstrap-admin.ts`, `apps/api/prisma/seed-dev.ts`
- **Action:** Separate development seed logic from production-safe bootstrap logic.
- **Function Signature:** `main(): Promise<void>`
- **Implementation Steps:**
  1. Move sample data and demo-user creation into `seed-dev.ts`.
  2. Create `bootstrap-admin.ts` for one-time first-admin creation.
  3. Keep `bootstrap-admin.ts` limited to empty-database behavior.
  4. Ensure bootstrap never overwrites existing `passwordHash`, `role`, or token fields.
- **Dependencies:** `@prisma/client`, `bcrypt`, `dotenv/config`
- **Implementation Notes:** Bootstrap must use explicit runtime credentials, not committed defaults.

### Step 3: Add environment gates to bootstrap behavior

- **Files:** `apps/api/prisma/bootstrap-admin.ts`, `apps/api/package.json`
- **Action:** Make bootstrap opt-in and fail fast when misconfigured.
- **Function Signature:** `validateBootstrapEnv(): void`
- **Implementation Steps:**
  1. Require `ENABLE_ADMIN_BOOTSTRAP=true` before bootstrap runs.
  2. Require `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME`.
  3. Validate that the user table is empty before insert.
  4. Exit with a clear non-zero error when validation fails.
- **Dependencies:** environment variables, Prisma user count query
- **Implementation Notes:** Do not print secrets in error output.

### Step 4: Update production startup command flow

- **Files:** `apps/api/docker-entrypoint.sh`, `apps/api/package.json`
- **Action:** Ensure production startup runs migrations and optionally bootstrap, but never dev seed.
- **Function Signature:** shell startup flow
- **Implementation Steps:**
  1. Replace unconditional seed execution in `docker-entrypoint.sh`.
  2. Run `npx prisma migrate deploy`.
  3. Conditionally execute bootstrap only if the explicit flag is enabled.
  4. Start the API process after safe initialization completes.
- **Dependencies:** shell entrypoint, npm scripts
- **Implementation Notes:** Startup logs should indicate which safe steps ran.

### Step 5: Align deployment and environment examples

- **Files:** `C:\Despliegues\AI4Devs-finalproject\docker-compose.yml`, `apps/api/.env.example`, `.env.example`
- **Action:** Reflect the new bootstrap model in deployment configuration and examples.
- **Function Signature:** N/A
- **Implementation Steps:**
  1. Remove any assumption that production always seeds demo data.
  2. Add optional bootstrap flags and variables to examples where appropriate.
  3. Mark bootstrap variables as production-optional and one-time only.
- **Dependencies:** Docker Compose environment configuration
- **Implementation Notes:** Keep development guidance distinct from production behavior.

### Step 6: Write automated verification

- **Files:** `apps/api/prisma/*.spec.ts` or `apps/api/test/auth.e2e-spec.ts` plus script-level tests
- **Action:** Add regression coverage for startup safety.
- **Function Signature:** test suites
- **Implementation Steps:**
  1. Test that production startup path does not execute dev seed.
  2. Test that bootstrap rejects non-empty databases.
  3. Test that bootstrap rejects missing required variables.
  4. Test that an existing admin password remains unchanged after restart-safe flows.
- **Dependencies:** Jest, Prisma test DB
- **Implementation Notes:** Favor script/unit coverage plus one integration-style regression.

### Step 7: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Update deployment documentation in `readme.md` where startup flow is described.
  2. Update `apps/api/README.md` with the new commands and environment rules.
  3. Mention the separation between `migrate`, `bootstrap-admin`, and `seed-dev`.
  4. Confirm all documentation remains in English.
- **References:** `docs/documentation-standards.mdc`
- **Notes:** This step is mandatory before considering the implementation complete.

---

## Implementation Order

1. Step 0: Create feature branch
2. Step 1: Audit current startup flow
3. Step 2: Split Prisma scripts
4. Step 3: Add environment gates
5. Step 4: Update production startup flow
6. Step 5: Align deployment and examples
7. Step 6: Write verification tests
8. Step 7: Update documentation

---

## Testing Checklist

- [ ] Production startup path no longer executes dev seed
- [ ] Empty database can bootstrap one admin only when explicitly enabled
- [ ] Non-empty database rejects bootstrap mutation
- [ ] Missing bootstrap variables fail fast
- [ ] Existing users keep the same password hash after restart-safe flows
- [ ] Development seed still works through an explicit non-production command

---

## Error Response Format

This story mainly affects startup and scripts rather than HTTP endpoints. Expected failures should use clear process errors:

```json
{
  "error": "Bootstrap configuration is invalid",
  "details": "Missing BOOTSTRAP_ADMIN_PASSWORD"
}
```

- Script / startup failures should exit with a non-zero status code.
- Error messages must identify the missing requirement without exposing secrets.

---

## Partial Update Support

Not applicable. This story changes startup orchestration, not partial resource updates.

---

## Dependencies

- Prisma CLI
- `@prisma/client`
- `bcrypt`
- Docker Compose
- Existing NestJS API runtime

---

## Notes

- Keep all technical artifacts in English.
- Do not restore any committed demo credentials in production-safe flows.
- Avoid bundling cleanup logic with bootstrap logic.
- This story is tightly related to `US-011` and should be coordinated with deployment hardening.

---

## Next Steps After Implementation

1. Execute `US-011_backend` to remove secret fallbacks and harden deployment config.
2. Review `US-013_backend` to protect destructive maintenance scripts with the same environment-safety mindset.
3. Re-run the security report scenarios to confirm the critical finding is closed.

---

## Implementation Verification

### Code Quality

- [ ] Startup responsibilities are split into focused scripts
- [ ] No hardcoded production passwords remain in bootstrap flows
- [ ] Error handling is explicit and type-safe

### Functionality

- [ ] Production startup runs safely without mutating real user data
- [ ] First-admin bootstrap works only in the intended empty-database case

### Testing

- [ ] Script-level and integration verification pass

### Integration

- [ ] Dockerized production startup still brings the API up successfully

### Documentation updates completed

- [ ] README and API operational docs reflect the new startup model
