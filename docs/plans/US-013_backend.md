# Backend Implementation Plan: US-013 Safe Destructive Operations

## Overview

Protect destructive Prisma maintenance scripts so they cannot be executed casually or against the wrong environment. This story focuses on adding explicit safeguards, removing hardcoded password-reset behavior from cleanup flows, and making the operator intent unmistakable.

**Architecture principles:** explicit operator intent, fail-fast environment checks, safe handling of runtime credentials, and small focused administrative scripts.

**User story reference:** [`us/seguridad/US-013-safe-destructive-operations.md`](../../us/seguridad/US-013-safe-destructive-operations.md)

**Out of scope:** automated backup orchestration, restore flows, or external approval systems.

---

## Architecture Context

### Layers involved

| Layer | Responsibility | Main artifacts |
|-------|----------------|----------------|
| **Infrastructure / Scripts** | Prisma maintenance commands | `apps/api/prisma/clean-db-admin-only.ts` |
| **Application** | Package script ergonomics and usage guidance | `apps/api/package.json` |
| **Operations** | Script safety messaging and docs | `apps/api/README.md` |

### Components/files referenced

- `apps/api/prisma/clean-db-admin-only.ts`
- `apps/api/package.json`
- `apps/api/README.md`
- `.env.example`

---

## Implementation Steps

### Step 0: Create Feature Branch

- **Action:** Create and switch to the backend feature branch.
- **Branch Naming:** `feature/US-013-backend`
- **Implementation Steps:**
  1. Update the shared base branch.
  2. Create `feature/US-013-backend`.
  3. Verify the current branch before changes.

### Step 1: Add hard execution guards

- **File:** `apps/api/prisma/clean-db-admin-only.ts`
- **Action:** Make unsafe execution impossible by default.
- **Function Signature:** `validateDestructiveExecution(): void`
- **Implementation Steps:**
  1. Reject execution when `NODE_ENV=production`.
  2. Reject execution unless `ALLOW_DESTRUCTIVE_DB_OPS=true`.
  3. Reject execution unless an explicit confirmation flag such as `--confirm` is present.
  4. Exit with a clear non-zero error code when any guard fails.
- **Dependencies:** `process.env`, argument parsing
- **Implementation Notes:** Guards should run before any Prisma write call.

### Step 2: Print sanitized target context before deletion

- **File:** `apps/api/prisma/clean-db-admin-only.ts`
- **Action:** Make the operator aware of the target environment and database before mutation starts.
- **Function Signature:** `getTargetSummary(databaseUrl: string): SanitizedTargetSummary`
- **Implementation Steps:**
  1. Parse the current DB target from `DATABASE_URL`.
  2. Print host, database name, and `NODE_ENV` in sanitized form.
  3. Avoid printing usernames/passwords or full connection strings.
- **Dependencies:** URL parsing
- **Implementation Notes:** Showing the target DB is a safety feature, not a verbose debug log.

### Step 3: Remove implicit hardcoded password reset

- **File:** `apps/api/prisma/clean-db-admin-only.ts`
- **Action:** Stop restoring known admin credentials as part of cleanup.
- **Function Signature:** cleanup flow
- **Implementation Steps:**
  1. Remove any unconditional reset to `AdminPass123` or similar committed values.
  2. If a password reset is still needed operationally, separate it into a distinct explicit script.
  3. Ensure cleanup-only mode focuses on data removal, not credential mutation.
- **Dependencies:** current admin reset logic
- **Implementation Notes:** Data cleanup and admin reset should not be bundled silently.

### Step 4: Improve package scripts and naming

- **File:** `apps/api/package.json`
- **Action:** Make destructive commands self-documenting.
- **Function Signature:** npm scripts
- **Implementation Steps:**
  1. Rename or add scripts with explicit destructive naming.
  2. Document required flags in the command usage.
  3. Distinguish destructive cleanup from read-only helper utilities.
- **Dependencies:** npm scripts
- **Implementation Notes:** A cautious operator should understand the risk from the script name alone.

### Step 5: Add verification coverage

- **Files:** script-level tests or dedicated safety-check tests
- **Action:** Prove the safety gates work.
- **Function Signature:** test suites
- **Implementation Steps:**
  1. Test rejection in production mode.
  2. Test rejection without `ALLOW_DESTRUCTIVE_DB_OPS=true`.
  3. Test rejection without `--confirm`.
  4. Test that no hardcoded password reset occurs in cleanup-only flow.
- **Dependencies:** Jest or script-runner tests
- **Implementation Notes:** Focus on guard behavior rather than full destructive execution in tests.

### Step 6: Update Technical Documentation

- **Action:** Review and update technical documentation according to changes made.
- **Implementation Steps:**
  1. Document destructive-script safety rules in `apps/api/README.md`.
  2. Explain the allow flag and confirmation requirements.
  3. Clarify that cleanup is non-production only.
  4. Keep documentation in English.
- **References:** `docs/documentation-standards.mdc`

---

## Implementation Order

1. Step 0: Create branch
2. Step 1: Add execution guards
3. Step 2: Print sanitized target context
4. Step 3: Remove hardcoded password reset
5. Step 4: Improve package scripts
6. Step 5: Add verification coverage
7. Step 6: Update documentation

---

## Testing Checklist

- [ ] Script rejects production mode
- [ ] Script rejects missing allow flag
- [ ] Script rejects missing explicit confirmation
- [ ] Script shows sanitized target DB info
- [ ] Cleanup-only flow no longer resets admin password to a known value

---

## Error Response Format

This story affects scripts rather than HTTP responses. Expected failures should use clear process errors:

```json
{
  "error": "Unsafe destructive operation blocked",
  "details": "ALLOW_DESTRUCTIVE_DB_OPS=true and --confirm are required"
}
```

Use non-zero exits and actionable, non-secret-leaking messages.

---

## Partial Update Support

Not applicable. This story changes destructive script behavior only.

---

## Dependencies

- Prisma maintenance scripts
- npm package scripts
- Environment-variable parsing

---

## Notes

- This story should be implemented even if the script is used rarely; the risk is operational, not frequency-based.
- Coordinate with `US-010_backend` so no maintenance flow silently restores insecure credentials.

---

## Next Steps After Implementation

1. Re-run the security-report destructive-script scenario.
2. Apply the same guard pattern to any future destructive utility.

---

## Implementation Verification

### Code Quality

- [ ] Safety checks run before any mutation
- [ ] Script responsibilities are explicit and focused

### Functionality

- [ ] Safe local cleanup remains possible when all guards are satisfied

### Testing

- [ ] Guard-behavior tests pass

### Integration

- [ ] Package scripts communicate risk clearly

### Documentation updates completed

- [ ] README explains the destructive-operation safety model
