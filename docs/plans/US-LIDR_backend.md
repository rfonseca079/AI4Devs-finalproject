# Backend Implementation Plan: US-LIDR Install, tests, and login limit

## Overview

Close the documentation and wiring gaps in [`us/US-Revisión-Lidr.md`](../../us/US-Revisión-Lidr.md). The security behavior (US-010–US-014) already exists. This plan does not add features and does not relax production checks.

Implement in order: **HU-01 → HU-02 → HU-03 → HU-04 → HU-05 → HU-06**. Each story stays closed before the next one starts.

**Story:** [`us/US-Revisión-Lidr.md`](../../us/US-Revisión-Lidr.md)  
**Branch:** stay on `finalproject-RFM`. Do not create a feature branch.  
**Do not touch:** `C:\Despliegues` (its `.env`, running Compose, containers, or database). Do not run seed, bootstrap, or the new test preparer against that database. Do not run `docker compose down -v`.

**Out of scope:** `ai-specs`, CI/CD, login Enter key, Helmet/CSP, `COOKIE_SECURE`, changing `validate-environment.ts` rules, changing the login limit of 5 attempts / 15 minutes, and any Android or web UI work.

## Architecture Context

```text
HU-01  .env.docker.example + Grafana interpolation
HU-02  comments only; existing validate-environment stays strict
HU-03  Compose passes BOOTSTRAP_ADMIN_* ; success log has no email
HU-04  README 1.4 matches docker-entrypoint.sh
HU-05  test-only wipe + reseed; E2E beforeAll uses it
HU-06  login throttle key trusts X-Forwarded-For only from the Compose web proxy
```

Production startup remains: `prisma migrate deploy`, optional bootstrap when `ENABLE_ADMIN_BOOTSTRAP=true`, never `seed-dev`.

### Files

```text
.env.docker.example                         # HU-01
docker-compose.yml                          # HU-01, HU-02, HU-03 (repo copy only)
readme.md                                   # HU-01, HU-02, HU-04, HU-05
apps/api/prisma/bootstrap-admin.ts          # HU-03 log line
apps/api/prisma/prepare-test-db.ts          # HU-05 NEW
apps/api/package.json                       # HU-05 script
apps/api/src/common/utils/admin-bootstrap.ts
apps/api/src/common/utils/admin-bootstrap.spec.ts
apps/api/test/*.e2e-spec.ts                 # HU-05 beforeAll
apps/api/src/modules/auth/utils/client-ip.ts          # HU-06 NEW
apps/api/src/modules/auth/utils/client-ip.spec.ts     # HU-06 NEW
apps/api/src/modules/auth/guards/login-throttler.guard.ts  # HU-06 NEW
apps/api/src/modules/auth/auth.controller.ts
apps/api/test/auth.e2e-spec.ts
```

Do not edit `apps/api/src/common/utils/validate-environment.ts` or `apps/api/docker-entrypoint.sh` except to re-read them as the source of truth.

## Implementation Steps

### Step 0: Stay on `finalproject-RFM`

- Confirm `git branch --show-current` is `finalproject-RFM`.
- Do not create `feature/US-LIDR-backend`.
- Do not copy files into `C:\Despliegues` and do not print or overwrite its `.env`.

### Step 1: HU-01 — example env and Grafana interpolation

Compose interpolates the whole file before profile filtering. `GRAFANA_ADMIN_PASSWORD:?` fails `docker compose config` even when the `observability` profile is off. A `:?` cannot be limited to that profile inside this file.

- **`.env.docker.example`:** replace the two `mecatrack-docker-*` JWT lines. List every variable Compose reads, with comments that the values are placeholders and are not valid production secrets.

  | Variable | Example content |
  |----------|-----------------|
  | `POSTGRES_USER` | placeholder, not presented as a safe production user |
  | `POSTGRES_PASSWORD` | placeholder other than `mecatrack`, `postgres`, or `password` |
  | `POSTGRES_DB` | a database name the operator chooses |
  | `JWT_ACCESS_SECRET` | 32+ characters, not `change-me-*` and not `mecatrack-docker-*` |
  | `JWT_REFRESH_SECRET` | different from the access secret, same rejection rules |
  | `GRAFANA_ADMIN_USER` | `admin` |
  | `GRAFANA_ADMIN_PASSWORD` | placeholder; required only before `--profile observability` |
  | `ENABLE_ADMIN_BOOTSTRAP` | `false` |
  | `BOOTSTRAP_ADMIN_EMAIL` | empty or commented |
  | `BOOTSTRAP_ADMIN_PASSWORD` | empty or commented |
  | `BOOTSTRAP_ADMIN_NAME` | empty or commented |
  | `ENABLE_HSTS` | `false` |
  | `WEB_PORT` | commented; the operator chooses the published port |

- **`docker-compose.yml`:** change Grafana to `${GRAFANA_ADMIN_PASSWORD:-}`. Keep `:?` on `POSTGRES_*` and both JWT secrets. Add a comment on the Grafana service: do not start `--profile observability` until `GRAFANA_ADMIN_PASSWORD` is set. Do not give Grafana a default password such as `admin`.
- **`readme.md`:** one sentence in the install section: copy `.env.docker.example` to `.env` in the repo root before `docker compose up`. Leave the rest of section 1.4 for HU-04.
- **Verify:** from the repo root, with `GRAFANA_ADMIN_PASSWORD` unset, `docker compose config` exits 0. `docker compose --profile observability config` also exits 0 when the variable is unset, because Compose cannot scope `:?` to a profile. The profile still requires the operator to set the password before `up`, as the comment and example say.
- **Do not** change `validate-environment.ts`. **Do not** start the stack against the Despliegues `.env`.

### Step 2: HU-02 — document the existing secret rules

No behavior change. `validateEnvironmentFromProcessEnv()` already runs in `main.ts` before `listen` when `NODE_ENV=production` or `ENFORCE_SECURE_CONFIG=true`. Compose already sets `NODE_ENV=production` on `api`. Invalid config throws `InvalidEnvironmentError` (`Invalid production configuration: ...`) and the process exits non-zero. An unreachable Postgres error happens later and must stay a different error.

- Add a comment on the `api` service listing the current rules: JWT secrets required, at least 32 characters, not `change-me-*` or `mecatrack-docker-*`; `DATABASE_URL` password not `mecatrack`, `postgres`, or `password`.
- Add the same minimums as a short paragraph in the install section. Do not contradict the HU-04 wording (no automatic seed, ports chosen per deployment).
- Run `apps/api` unit tests for `validate-environment.spec.ts`. Placeholders, short JWTs, and trivial database passwords must still fail.
- Do not catch `InvalidEnvironmentError` in `main.ts`. Do not add those placeholders back as accepted values.

### Step 3: HU-03 — pass bootstrap credentials, stop logging the email

`apps/api/docker-entrypoint.sh` already runs `prisma/dist-seed/bootstrap-admin.js` only when `ENABLE_ADMIN_BOOTSTRAP=true`, and `assertUserTableEmpty` already refuses a non-empty `User` table. Compose passes the flag with default `false` and does not pass the three credential variables. `bootstrap-admin.ts` logs `Admin bootstrap completed for ${admin.email}`.

- On the `api` service `environment`, add `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_NAME` from the host `.env`, defaulting to empty. Leave `ENABLE_ADMIN_BOOTSTRAP: ${ENABLE_ADMIN_BOOTSTRAP:-false}`.
- Change the success log to a fixed English sentence with no email and no password. Do not log the password on the failure path either.
- Keep `admin-bootstrap.spec.ts` cases for a non-empty user table and a short password. Do not weaken `assertNotProductionSeed`.
- **Manual check, dev database only:** use an empty development database, set the flag and the three variables only in that environment, start the API, log in with `POST /api/auth/login`, start again, and confirm there is still one admin and the logs contain neither the email nor the password. Do not run `db:seed:dev` in that check. Leave production `ENABLE_ADMIN_BOOTSTRAP=false` and do not run bootstrap there.

### Step 4: HU-04 — make README 1.4 match the entrypoint

Section 1.4 currently says the API loads test data on startup and lists `admin@taller.com` / `AdminPass123` as the way in. The entrypoint only migrates, then bootstraps if the flag is on. Demo accounts exist only after an explicit dev seed, which throws if `NODE_ENV=production`.

Rewrite section 1.4, in the Spanish already used by that section:

- Copy `.env.docker.example` to `.env`, then `docker compose up`.
- The API applies migrations automatically and does not seed.
- The first administrator is opt-in: `ENABLE_ADMIN_BOOTSTRAP=true` plus the three `BOOTSTRAP_ADMIN_*` values, and only when `User` is empty.
- `admin@taller.com` / `AdminPass123` and `mechanic@taller.com` / `MechanicPass123` are not created by a fresh install or by production. Point to the test section (HU-05) for those accounts.
- Published ports are chosen per deployment (`WEB_PORT` and the Postgres host port in Compose). Do not present `3000`, `3010`, `4010`, `5434`, or `5435` as the product’s required ports.
- Distinguish development (explicit seed, never when `NODE_ENV=production`) from production (migrations and opt-in bootstrap). Do not tie either path to a specific folder, including `C:\Despliegues`.

Section 2.4–2.5: do not rewrite the startup model. If a sentence treats this machine’s ports as the only valid ones, rephrase them as an example of one deployment. Search the README for `3000`, `3010`, `4010`, `5434`, `5435`, `AdminPass123`, and `C:\Despliegues`. Keep a number only when it is clearly an optional example.

Do not document `docker compose down -v` or any volume delete. Read the finished 1.4 against `docker-entrypoint.sh` before closing the story.

### Step 5: HU-05 — test database preparer

`seed-dev.ts` upserts users and does not update an existing `passwordHash`. E2E `beforeAll` hooks call `npx prisma db seed`, so a stale hash breaks demo login. `db:clean:destructive` is not this command and must not be pointed at production.

- Add `apps/api/prisma/prepare-test-db.ts` and npm script `db:prepare:test`, separate from `db:seed:dev`.
- Refuse immediately through the existing `assertNotProductionSeed` when `NODE_ENV=production`. Non-zero exit, no delete, no insert.
- Also refuse unless the database name in `DATABASE_URL` contains `test`. Print host, port, database name, and `NODE_ENV` only. Never print the URL, password, or token.
- On the allowed database, empty domain tables and then run the existing dev seed so the three users are created again with new hashes:

  | Email | Password | Role | Active |
  |-------|----------|------|--------|
  | `admin@taller.com` | `AdminPass123` | `ADMIN` | `true` |
  | `mechanic@taller.com` | `MechanicPass123` | `MECHANIC` | `true` |
  | `inactive@taller.com` | `InactivePass123` | `MECHANIC` | `false` |

- Do not change `seed-dev.ts` upserts so a normal `db:seed:dev` still leaves existing password hashes alone. The preparer gets a fresh hash because it deletes first.
- Do not change `docker-entrypoint.sh`. Do not call `db:clean:destructive`.
- Replace `npx prisma db seed` in `apps/api/test/*.e2e-spec.ts` `beforeAll` with `db:prepare:test`. Leave Playwright as it is: it does not prepare a database and must not be aimed at production or at Despliegues.
- Unit-test the production rejection and the non-test database-name rejection without opening a connection. Run the command twice against the local test database and then run `auth.e2e-spec.ts`. Confirm the process environment `DATABASE_URL` is the test database before either run.

Document the command and the three passwords as development and test only, in the README section HU-04 points at. Do not put them back in section 1.4 as the install login.

### Step 6: HU-06 — login throttle behind the Next proxy

`POST /api/auth/login` already uses `@UseGuards(ThrottlerGuard)` and `@Throttle({ default: { limit: 5, ttl: 900_000 } })`. The global module limit is 5 in `production` and `test`, and 1000 in local development (`auth.module.ts`). There is no `trust proxy`. Behind `API_PROXY_TARGET=http://api:4000`, Express sees the web container address for every user.

- Do not call `app.set('trust proxy', true)` or a hop count in `main.ts`.
- Add `resolveLoginClientIp` in `apps/api/src/modules/auth/utils/client-ip.ts`:
  - If `remoteAddress` is in the trusted proxy set, the tracker is the first address in `X-Forwarded-For` (trim, ignore the header when it is empty or not an IP, and then fall back to `remoteAddress`).
  - Otherwise ignore `X-Forwarded-For` and use `remoteAddress`.
  - Trusted addresses come from `TRUSTED_PROXY_IPS` and from resolving `TRUSTED_PROXY_HOSTS` (Compose sets `TRUSTED_PROXY_HOSTS=web`) at startup. A direct client cannot choose its tracker by sending the header.
- Add a `ThrottlerGuard` subclass whose `getTracker` uses that helper, and use it only on `POST /api/auth/login`. Leave `limit` and `ttl` as they are. Do not change other `/api/auth/*` routes.
- In the repo `docker-compose.yml` `api` environment, set `TRUSTED_PROXY_HOSTS=web`. Do not publish the API port.
- Unit tests: a trusted socket distinguishes two forwarded addresses; an untrusted socket keeps one tracker when the header is spoofed; a missing header uses the socket address.
- E2E on the HU-05 test database, not Despliegues: the sixth attempt for one tracker returns `429`; a second tracker is not blocked. With the test peer absent from `TRUSTED_PROXY_IPS`, different `X-Forwarded-For` values still share the socket counter.

Do not log passwords, `Authorization`, or refresh cookies while counting.

### Step 7: Documentation check

- README install text matches the entrypoint and does not teach demo passwords as production access.
- Comments and new code identifiers stay in English. Section 1.4 stays Spanish.
- No OpenAPI change. Login request and response bodies stay the same (`200`, `401`, `429`).

## Testing Checklist

- [ ] `docker compose config` succeeds when `GRAFANA_ADMIN_PASSWORD` is unset.
- [ ] `POSTGRES_*` and `JWT_*` still use `:?`.
- [ ] `validate-environment.spec.ts` still rejects short JWTs, placeholders, and trivial database passwords.
- [ ] Bootstrap success log has no email and no password. Default flag remains `false`.
- [ ] README 1.4 describes copy-env, migrate, no seed, and opt-in bootstrap.
- [ ] `db:prepare:test` refuses `NODE_ENV=production` and a database name without `test`.
- [ ] Two runs of the preparer on the test database leave demo login working.
- [ ] Login limit stays 5 / 900000 ms in production and test.
- [ ] Spoofed `X-Forwarded-For` does not change the tracker on a direct connection.
- [ ] No command in this plan was run against `C:\Despliegues`.

## Dependencies

- Existing US-010 entrypoint, US-011 `validate-environment`, US-013 destructive-script guards, and US-014 login message. Do not reimplement them.
- `@nestjs/throttler` `^6.5.0` is already installed. No new dependency and no migration.

## Implementation Verification

- [ ] Server-side rules for secrets, seed, and the 5 / 15 minute limit are unchanged.
- [ ] The file list above is the complete code change, plus the README and the example env.
- [ ] Unit tests for environment validation, bootstrap guards, the preparer refusal, and client IP pass.
- [ ] Auth E2E uses `db:prepare:test` and covers `429` per tracker.
- [ ] Despliegues `.env`, Compose, and database were not read for mutation and were not modified.
